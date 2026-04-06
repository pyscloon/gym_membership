import request from "supertest";
import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { spawn } from "child_process";
import * as dotenv from "dotenv";

dotenv.config();

const port = process.env.PORT || 4000;
const baseUrl = `http://127.0.0.1:${port}`;
const clientOrigin = process.env.CLIENT_ORIGIN;

if (!clientOrigin) {
  throw new Error("Missing required env variable: CLIENT_ORIGIN");
}

const client = request(baseUrl);
let serverProcess: ReturnType<typeof spawn> | null = null;

// Simple sleep helper
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Wait for server to be ready
async function waitForServerReady(maxAttempts = 30) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const res = await client.get("/api/health");
      if (res.statusCode === 200) return;
    } catch {
      // Not ready yet
    }
    await sleep(200);
  }
  throw new Error("Server did not become ready in time");
}

describe("API Integration Tests", () => {
  beforeAll(async () => {
    // Start the server in test mode
    serverProcess = spawn(process.execPath, ["server/index.js"], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PORT: String(port),
        CLIENT_ORIGIN: clientOrigin,
        NODE_ENV: "test", // ensures fallback works
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

  describe("GET /api/health", () => {
    it("should return 200 with expected health payload", async () => {
      const res = await client.get("/api/health");

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe("ok");
      expect(res.body.message).toBe("Express server is running.");
      expect(res.body.allowedOrigin).toBe(clientOrigin);
    });

    it("should include CORS headers for the configured origin", async () => {
      const res = await client.get("/api/health").set("Origin", clientOrigin);

      expect(res.statusCode).toEqual(200);
      expect(res.headers["access-control-allow-origin"]).toBe(clientOrigin);
      expect(res.headers["access-control-allow-credentials"]).toBe("true");
    });

    it("should allow fallback HTML for unknown GET routes", async () => {
      const res = await client.get("/api/unknown-route");

      expect(res.statusCode).toEqual(200);
      expect(res.headers["content-type"]).toContain("text/html");
      expect(res.text).toContain("Test HTML fallback"); // matches our test fallback
    });

    it("should allow fallback HTML for completely unknown routes", async () => {
      const res = await client.get("/non-existent-route");

      expect(res.statusCode).toEqual(200);
      expect(res.headers["content-type"]).toContain("text/html");
      expect(res.text).toContain("Test HTML fallback");
    });

    it("should return fallback HTML for POST /api/health (invalid method)", async () => {
      const res = await client.post("/api/health");

      expect(res.statusCode).toEqual(200);
      expect(res.headers["content-type"]).toContain("text/html");
      expect(res.text).toContain("Test HTML fallback");
    });

    it("should ignore unexpected query params and still return health response", async () => {
      const res = await client.get("/api/health?foo=bar");

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe("ok");
    });

    it("should handle requests without Origin header (CORS still applied by server)", async () => {
      const res = await client.get("/api/health");

      expect(res.statusCode).toEqual(200);
      expect(res.headers["access-control-allow-origin"]).toBe(clientOrigin);
      expect(res.headers["access-control-allow-credentials"]).toBe("true");
    });
  });
});