import request from "supertest";
import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { spawn } from "child_process";

const port = process.env.PORT || "4003";
const baseUrl = `http://127.0.0.1:${port}`;
const client = request(baseUrl);

let serverProcess: ReturnType<typeof spawn> | null = null;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServerReady(maxAttempts = 30) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const res = await client.get("/api/health");
      if (res.statusCode === 200) {
        return;
      }
    } catch {
      // Server is not ready yet.
    }

    await sleep(200);
  }

  throw new Error("Server did not become ready in time");
}

describe("Best Time Suggestions API", () => {
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

  it("returns best and worst ranges in expected payload shape", async () => {
    const res = await client.get("/api/crowd/best-times?days=7&topCount=3");

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data.best_time_ranges)).toBe(true);
    expect(Array.isArray(res.body.data.worst_time_ranges)).toBe(true);
    expect(Array.isArray(res.body.data.hourly_averages)).toBe(true);
  });
});