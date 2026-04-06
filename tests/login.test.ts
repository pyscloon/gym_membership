import request from "supertest";
import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { spawn } from "child_process";
import * as dotenv from "dotenv";

dotenv.config();

const port = process.env.PORT || "4002";
const baseUrl = `http://127.0.0.1:${port}`;
const client = request(baseUrl);

let serverProcess: ReturnType<typeof spawn> | null = null;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServerReady(maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await client.get("/api/health");
      if (res.statusCode === 200) return;
    } catch {}
    await sleep(200);
  }
  throw new Error("Server did not become ready in time");
}

describe("Login API Integration Tests", () => {
  beforeAll(async () => {
    serverProcess = spawn(process.execPath, ["server/index.js"], {
      cwd: process.cwd(),
      env: { ...process.env, PORT: String(port) },
      stdio: "ignore",
    });

    await waitForServerReady();
  }, 15000);

  afterAll(() => {
    if (serverProcess && !serverProcess.killed) {
      serverProcess.kill();
    }
  });

  describe("POST /api/login — Happy Path", () => {
    it("should return 200 when email and password are provided", async () => {
      const res = await client.post("/api/login").send({
        email: "test@example.com",
        password: "123456",
      });

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe("ok");
      expect(res.body.message).toBe("Login request received.");
    });
  });

  describe("POST /api/login — Sad Path", () => {
    it("should return 400 when both email and password are missing", async () => {
      const res = await client.post("/api/login").send({});

      expect(res.statusCode).toEqual(400);
      expect(res.body.status).toBe("error");
      expect(res.body.message).toBe("Please enter your email and password.");
    });

    it("should return 400 when email is missing", async () => {
      const res = await client.post("/api/login").send({
        password: "123456",
      });

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toBe("Please enter your email and password.");
    });

    it("should return 400 when password is missing", async () => {
      const res = await client.post("/api/login").send({
        email: "test@example.com",
      });

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toBe("Please enter your email and password.");
    });
  });
});