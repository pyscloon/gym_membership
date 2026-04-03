import request from "supertest";
import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { spawn } from "child_process";

const port = process.env.PORT || "4000";
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

describe("API Integration Tests", () => {
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

	describe("GET /api/health", () => {
		it("should return 200 with expected health payload", async () => {
			const res = await client.get("/api/health");

			expect(res.statusCode).toEqual(200);
			expect(res.body.status).toBe("ok");
			expect(res.body.message).toBe("Express server is running.");
			expect(res.body.allowedOrigin).toBeDefined();
		});

		it("should include CORS headers for configured origin", async () => {
			const origin = process.env.CLIENT_ORIGIN || "http://localhost:5173";

			const res = await client.get("/api/health").set("Origin", origin);

			expect(res.statusCode).toEqual(200);
			expect(res.headers["access-control-allow-origin"]).toBe(origin);
			expect(res.headers["access-control-allow-credentials"]).toBe("true");
		});

		it("should return 404 for unknown routes", async () => {
			const res = await client.get("/api/unknown-route");

			expect(res.statusCode).toEqual(404);
		});
	});
});