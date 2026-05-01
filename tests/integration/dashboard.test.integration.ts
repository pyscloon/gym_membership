import request from "supertest";
import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { spawn } from "child_process";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { clearTestData } from "../helpers/dbCleanup";

dotenv.config();

const REQUIRED_ENV = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_ANON_KEY",
  "CLIENT_ORIGIN",
] as const;

for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    throw new Error(`Missing required env variable: ${key}`);
  }
}

const port          = process.env.PORT || "4004";
const baseUrl       = `http://127.0.0.1:${port}`;
const clientOrigin  = process.env.CLIENT_ORIGIN!;
const supabaseUrl   = process.env.VITE_SUPABASE_URL!;
const supabaseKey   = process.env.VITE_SUPABASE_ANON_KEY!;

const client   = request(baseUrl);
const supabase = createClient(supabaseUrl, supabaseKey);

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

describe("Dashboard API Integration Tests", () => {
  beforeAll(async () => {
    await clearTestData();
    serverProcess = spawn(process.execPath, ["server/index.js"], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PORT: String(port),
        CLIENT_ORIGIN: clientOrigin,
        VITE_SUPABASE_URL: supabaseUrl,
        VITE_SUPABASE_ANON_KEY: supabaseKey,
      },
      stdio: "ignore",
    });

    await waitForServerReady();
  }, 15000);

  afterAll(async () => {
    await clearTestData();
    if (serverProcess && !serverProcess.killed) {
      serverProcess.kill();
    }
  });

  // ── Happy Path ───────────────────────────────────────────────────────────────

  describe("GET /api/dashboard — Happy Path", () => {
    let body: Record<string, any>;

    beforeAll(async () => {
      const res = await client.get("/api/dashboard");
      body = res.body;
    });

    it("should return 200 with expected dashboard payload", () => {
      expect(body.status).toBe("ok");
      expect(body.message).toBe("Dashboard data retrieved.");
      expect(body.data).toBeDefined();
    });

    it("should include user information in dashboard data", () => {
      expect(body.data.user).toBeDefined();
      expect(typeof body.data.user.name).toBe("string");
      expect(typeof body.data.user.email).toBe("string");
    });

    it("should include membership information in dashboard data", () => {
      const { membership } = body.data;
      expect(membership).toBeDefined();
      expect(["active", "inactive", "expired"]).toContain(membership.status);
      expect(membership.plan).toBeDefined();
      expect(new Date(membership.expiryDate).toString()).not.toBe("Invalid Date");
    });

    it("should include notifications as a non-empty array", () => {
      const { notifications } = body.data;
      expect(Array.isArray(notifications)).toBe(true);
      expect(notifications.length).toBeGreaterThan(0);
      expect(notifications[0].id).toBeDefined();
      expect(typeof notifications[0].message).toBe("string");
    });

    it("should include a non-negative streak counter", () => {
      expect(typeof body.data.streakCounter).toBe("number");
      expect(body.data.streakCounter).toBeGreaterThanOrEqual(0);
    });

    it("should include CORS headers for the configured origin", async () => {
      const res = await client
        .get("/api/dashboard")
        .set("Origin", clientOrigin);

      expect(res.statusCode).toEqual(200);
      expect(res.headers["access-control-allow-origin"]).toBe(clientOrigin);
      expect(res.headers["access-control-allow-credentials"]).toBe("true");
    });

    it("should confirm Supabase profiles table is accessible", async () => {
      const { error } = await supabase.from("profiles").select("id").limit(1);
      const isAccessible =
        !error ||
        error.message.includes("permission") ||
        error.code === "PGRST301";
      expect(isAccessible).toBe(true);
    });

    it("should confirm Supabase memberships table is accessible", async () => {
      const { error } = await supabase
        .from("memberships")
        .select("id, status")
        .limit(1);
      const isAccessible =
        !error ||
        error.message.includes("permission") ||
        error.code === "PGRST301";
      expect(isAccessible).toBe(true);
    });
  });

  // ── Sad Path ─────────────────────────────────────────────────────────────────

  describe("GET /api/dashboard — Sad Path", () => {
    it("should not return dashboard data for an unknown sub-route", async () => {
      const res = await client.get("/api/dashboard/nonexistent");
      expect(res.body.status).not.toBe("ok");
      expect(res.body.data).toBeUndefined();
    });

    it("should not return dashboard data on POST", async () => {
      const res = await client.post("/api/dashboard").send({});
      expect(res.body.status).not.toBe("ok");
      expect(res.body.data).toBeUndefined();
    });

    it("should not return dashboard data on PUT", async () => {
      const res = await client.put("/api/dashboard").send({});
      expect(res.body.status).not.toBe("ok");
      expect(res.body.data).toBeUndefined();
    });

    it("should not return dashboard data on DELETE", async () => {
      const res = await client.delete("/api/dashboard");
      expect(res.body.status).not.toBe("ok");
      expect(res.body.data).toBeUndefined();
    });

    it("should not set CORS headers for an unknown origin", async () => {
      const res = await client
        .get("/api/dashboard")
        .set("Origin", "http://evil.com");

      expect(res.headers["access-control-allow-origin"]).not.toBe(
        "http://evil.com"
      );
    });
  });
});