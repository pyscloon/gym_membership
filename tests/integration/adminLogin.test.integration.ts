import request from "supertest";
import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { spawn } from "child_process";
import { clearTestData } from "../helpers/dbCleanup";

const port = process.env.PORT  || "4001";
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

describe("Admin Login API Integration Tests", () => {
  beforeAll(async () => {
    await clearTestData();
    serverProcess = spawn(process.execPath, ["server/index.js"], {
      cwd: process.cwd(),
      env: { ...process.env, PORT: String(port), VITE_ADMIN_EMAIL: adminEmail },
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

  describe("POST /api/admin/login — Happy Path", () => {
    it("should return 200 for the configured admin email", async () => {
      const res = await client.post("/api/admin/login").send({
        email: adminEmail,
        password: "secret",
      });

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe("ok");
      expect(res.body.message).toBe("Admin credentials accepted.");
    });

    it("should accept the admin email case-insensitively", async () => {
      const res = await client.post("/api/admin/login").send({
        email: adminEmail.toUpperCase(),
        password: "secret",
      });

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe("ok");
      expect(res.body.adminEmail).toBe(adminEmail.toLowerCase());
    });
  });

  describe("POST /api/admin/login — Sad Path", () => {
    it("should return 400 when both email and password are missing", async () => {
      const res = await client.post("/api/admin/login").send({});

      expect(res.statusCode).toEqual(400);
      expect(res.body.status).toBe("error");
      expect(res.body.message).toBe("Please enter admin email and password.");
    });

    it("should return 403 when a non-admin email is used", async () => {
      const res = await client.post("/api/admin/login").send({
        email: "notanadmin@example.com",
        password: "secret",
      });

      expect(res.statusCode).toEqual(403);
      expect(res.body.status).toBe("error");
      expect(res.body.message).toBe("This account is not allowed to access the admin portal.");
    });
  });
});