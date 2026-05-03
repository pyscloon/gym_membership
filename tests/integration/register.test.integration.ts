import request from "supertest";
import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { spawn } from "child_process";
import { clearTestData } from "../helpers/dbCleanup";

const port = process.env.PORT || "4006";
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

describe("Register API Integration Tests", () => {
  beforeAll(async () => {
    await clearTestData();
    serverProcess = spawn(process.execPath, ["server/index.js"], {
      cwd: process.cwd(),
      env: { ...process.env, PORT: String(port) },
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

  describe("POST /api/register — Happy Path", () => {
    it("should return 201 for valid registration data", async () => {
      const res = await client.post("/api/register").send({
        name: "John Doe",
        email: "john@example.com",
        password: "123456",
      });

      expect(res.statusCode).toEqual(201);
      expect(res.body.status).toBe("ok");
      expect(res.body.message).toBe("Registration request received.");
    });
  });

  describe("POST /api/register — Sad Path", () => {
    it("should return 400 when all fields are missing", async () => {
      const res = await client.post("/api/register").send({});

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toBe(
        "Please provide your name, email, and password."
      );
    });

    it("should return 400 when name is missing", async () => {
      const res = await client.post("/api/register").send({
        email: "john@example.com",
        password: "123456",
      });

      expect(res.statusCode).toEqual(400);
    });

    it("should return 400 for invalid email format", async () => {
      const res = await client.post("/api/register").send({
        name: "John Doe",
        email: "invalid-email",
        password: "123456",
      });

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toBe("Please provide a valid email address.");
    });

    it("should return 400 for short password", async () => {
      const res = await client.post("/api/register").send({
        name: "John Doe",
        email: "john@example.com",
        password: "123",
      });

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toBe(
        "Password must be at least 6 characters."
      );
    });
  });
});