import request from "supertest";
import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { spawn } from "child_process";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

const REQUIRED_ENV = ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"] as const;

for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    throw new Error(`Missing required env variable: ${key}`);
  }
}

const port = process.env.PORT || "4003";
const baseUrl = `http://127.0.0.1:${port}`;
const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;

const client = request(baseUrl);
const supabase = createClient(supabaseUrl, supabaseAnonKey);

let serverProcess: ReturnType<typeof spawn> | null = null;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServerReady(maxAttempts = 30) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const res = await client.get("/api/health");
      if (res.statusCode === 200) return;
    } catch {
      // not ready yet
    }
    await sleep(200);
  }
  throw new Error("Server did not become ready in time");
}

describe("Best Time Suggestions API", () => {
  beforeAll(async () => {
    serverProcess = spawn(process.execPath, ["server/index.js"], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PORT: String(port),
        VITE_SUPABASE_URL: supabaseUrl,
        VITE_SUPABASE_ANON_KEY: supabaseAnonKey,
      },
      stdio: "ignore",
    });

    await waitForServerReady();
  }, 15000);

  afterAll(() => {
    if (serverProcess && !serverProcess.killed) {
      serverProcess.kill();
    }
  });

  describe("GET /api/crowd/best-times — Happy Path", () => {
    let body: Record<string, any>;

    beforeAll(async () => {
      const res = await client.get("/api/crowd/best-times?days=7&topCount=3");
      body = res.body;
    });

    it("should return 200 with status ok", () => {
      expect(body.status).toBe("ok");
      expect(body.message).toBe("Best time suggestions generated.");
    });

    it("should return the expected top-level data shape", () => {
      expect(body.data).toBeDefined();
      expect(Array.isArray(body.data.best_time_ranges)).toBe(true);
      expect(Array.isArray(body.data.worst_time_ranges)).toBe(true);
      expect(Array.isArray(body.data.hourly_averages)).toBe(true);
    });

    it("should return time ranges with correct fields", () => {
      for (const range of body.data.best_time_ranges) {
        expect(typeof range.label).toBe("string");
        expect(typeof range.startHour).toBe("number");
        expect(typeof range.endHour).toBe("number");
        expect(typeof range.avgCrowd).toBe("number");
      }
    });

    it("should return hourly averages with correct fields", () => {
      for (const avg of body.data.hourly_averages) {
        expect(typeof avg.hour).toBe("number");
        expect(typeof avg.avgUsers).toBe("number");
        expect(typeof avg.avgCrowd).toBe("number");
        expect(typeof avg.sampleCount).toBe("number");
      }
    });

    it("should respect the days query parameter", async () => {
      const res = await client.get("/api/crowd/best-times?days=3");
      expect(res.body.data.daysAnalyzed).toBe(3);
    });

    it("should include a generatedAt timestamp", () => {
      expect(body.data.generatedAt).toBeDefined();
      expect(new Date(body.data.generatedAt).toString()).not.toBe("Invalid Date");
    });

    it("should confirm Supabase project is reachable", async () => {
      const { error } = await supabase.from("walk_ins").select("id").limit(1);
      const isReachable =
        !error ||
        error.message.includes("permission") ||
        error.code === "PGRST301";
      expect(isReachable).toBe(true);
    });
  });

  describe("GET /api/crowd/best-times — Sad Path", () => {
    it("should fall back to default days when days param is invalid", async () => {
      const res = await client.get("/api/crowd/best-times?days=abc");
      expect(res.statusCode).toBe(200);
      expect(res.body.data.daysAnalyzed).toBe(7); // default
    });

    it("should fall back to default topCount when topCount param is invalid", async () => {
      const res = await client.get("/api/crowd/best-times?topCount=xyz");
      expect(res.statusCode).toBe(200);
      // server defaults to 3 — best and worst ranges should still be arrays
      expect(Array.isArray(res.body.data.best_time_ranges)).toBe(true);
      expect(Array.isArray(res.body.data.worst_time_ranges)).toBe(true);
    });

    it("should fall back to default when days is zero", async () => {
      const res = await client.get("/api/crowd/best-times?days=0");
      expect(res.statusCode).toBe(200);
      expect(res.body.data.daysAnalyzed).toBe(7);
    });

    it("should fall back to default when days is negative", async () => {
      const res = await client.get("/api/crowd/best-times?days=-5");
      expect(res.statusCode).toBe(200);
      expect(res.body.data.daysAnalyzed).toBe(7);
    });

    it("should not return dashboard data on POST", async () => {
      const res = await client.post("/api/crowd/best-times").send({});
      expect(res.body.status).not.toBe("ok");
      expect(res.body.data).toBeUndefined();
    });
  });
});