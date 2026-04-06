import request from "supertest";
import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { spawn } from "child_process";
import * as dotenv from "dotenv";

dotenv.config();

const port = process.env.PORT;
const baseUrl = `http://127.0.0.1:${port}`;
const adminEmail = process.env.VITE_ADMIN_EMAIL;

if (!adminEmail) {
  throw new Error("Missing required env variable: VITE_ADMIN_EMAIL");
}

const client = request(baseUrl);
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

describe("Admin Dashboard API Integration Tests", () => {
  beforeAll(async () => {
    serverProcess = spawn(process.execPath, ["server/index.js"], {
      cwd: process.cwd(),
      env: { ...process.env, PORT: String(port), ADMIN_EMAIL: adminEmail },
      stdio: "ignore",
    });

    await waitForServerReady();
  }, 15000);

  afterAll(() => {
    if (serverProcess && !serverProcess.killed) {
      serverProcess.kill();
    }
  });

  describe("GET /api/dashboard — Happy Path", () => {
    let body: Record<string, any>;

    beforeAll(async () => {
      const res = await client.get("/api/dashboard");
      body = res.body;
    });

    it("should return 200 and dashboard data", () => {
      expect(body).toMatchObject({
        status: "ok",
        message: "Dashboard data retrieved.",
      });
    });

    it("should return data with correct structure", () => {
      expect(body.data).toBeDefined();
      expect(body.data.user).toBeDefined();
      expect(body.data.membership).toBeDefined();
      expect(body.data.notifications).toBeDefined();
    });

    it("should return valid user fields", () => {
      const { user } = body.data;
      expect(typeof user.name).toBe("string");
      expect(typeof user.email).toBe("string");
    });

    it("should return valid membership fields", () => {
      const { membership } = body.data;
      expect(["active", "inactive", "expired"]).toContain(membership.status);
      expect(membership.expiryDate).toBeDefined();
      expect(membership.plan).toBeDefined();
    });

    it("should return notifications as an array", () => {
      const { notifications } = body.data;
      expect(Array.isArray(notifications)).toBe(true);
      if (notifications.length > 0) {
        expect(notifications[0].id).toBeDefined();
        expect(notifications[0].message).toBeDefined();
      }
    });

    it("should return streakCounter as a non-negative number", () => {
      const { streakCounter } = body.data;
      expect(typeof streakCounter).toBe("number");
      expect(streakCounter).toBeGreaterThanOrEqual(0);
    });
  });

  describe("GET /api/dashboard — Sad Path", () => {
    it("should not return dashboard data for a non-existent sub-route", async () => {
      const res = await client.get("/api/dashboard/nonexistent");
      // Server catch-all serves the frontend — no dashboard JSON expected
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
  });
});