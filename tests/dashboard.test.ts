import request from "supertest";
import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { spawn } from "child_process";

const port = process.env.PORT || "4002";
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

describe("Dashboard API Integration Tests", () => {
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

	describe("GET /api/dashboard", () => {
		it("should return 200 with expected dashboard payload", async () => {
			const res = await client.get("/api/dashboard");

			expect(res.statusCode).toEqual(200);
			expect(res.body.status).toBe("ok");
			expect(res.body.message).toBe("Dashboard data retrieved.");
			expect(res.body.data).toBeDefined();
		});

		it("should include user information in dashboard data", async () => {
			const res = await client.get("/api/dashboard");

			expect(res.statusCode).toEqual(200);
			expect(res.body.data.user).toBeDefined();
			expect(res.body.data.user.name).toBe("John Doe");
			expect(res.body.data.user.email).toBe("member@example.com");
		});

		it("should include membership information in dashboard data", async () => {
			const res = await client.get("/api/dashboard");

			expect(res.statusCode).toEqual(200);
			expect(res.body.data.membership).toBeDefined();
			expect(res.body.data.membership.status).toBe("active");
			expect(res.body.data.membership.plan).toBe("Premium");
			expect(res.body.data.membership.expiryDate).toBeDefined();
		});

		it("should include notifications in dashboard data", async () => {
			const res = await client.get("/api/dashboard");

			expect(res.statusCode).toEqual(200);
			expect(res.body.data.notifications).toBeDefined();
			expect(Array.isArray(res.body.data.notifications)).toBe(true);
			expect(res.body.data.notifications.length).toBeGreaterThan(0);
		});

		it("should include streak counter in dashboard data", async () => {
			const res = await client.get("/api/dashboard");

			expect(res.statusCode).toEqual(200);
			expect(res.body.data.streakCounter).toBeDefined();
			expect(typeof res.body.data.streakCounter).toBe("number");
		});

		it("should include CORS headers for configured origin", async () => {
			const origin = process.env.CLIENT_ORIGIN || "http://localhost:5173";

			const res = await client.get("/api/dashboard").set("Origin", origin);

			expect(res.statusCode).toEqual(200);
			expect(res.headers["access-control-allow-origin"]).toBe(origin);
			expect(res.headers["access-control-allow-credentials"]).toBe("true");
		});
	});
});
