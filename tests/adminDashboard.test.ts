import request from "supertest";
import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { spawn } from "child_process";

const port = process.env.PORT || "4003";
const baseUrl = `http://127.0.0.1:${port}`;
const client = request(baseUrl);
const adminEmail = "admin@example.com";

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

	describe("GET /api/dashboard", () => {
		it("should return 200 and dashboard data", async () => {
			const res = await client.get("/api/dashboard");

			expect(res.statusCode).toEqual(200);
			expect(res.body.status).toBe("ok");
			expect(res.body.message).toBe("Dashboard data retrieved.");
		});

		it("should return data with correct structure", async () => {
			const res = await client.get("/api/dashboard");

			expect(res.body.data).toBeDefined();
			expect(res.body.data.user).toBeDefined();
			expect(res.body.data.membership).toBeDefined();
			expect(res.body.data.notifications).toBeDefined();
		});

		it("should return user information in dashboard data", async () => {
			const res = await client.get("/api/dashboard");
			const { user } = res.body.data;

			expect(user.name).toBeDefined();
			expect(user.email).toBeDefined();
			expect(typeof user.name).toBe("string");
			expect(typeof user.email).toBe("string");
		});

		it("should return membership information in dashboard data", async () => {
			const res = await client.get("/api/dashboard");
			const { membership } = res.body.data;

			expect(membership.status).toBeDefined();
			expect(membership.expiryDate).toBeDefined();
			expect(membership.plan).toBeDefined();
			expect(["active", "inactive", "expired"]).toContain(membership.status);
		});

		it("should return notifications as an array", async () => {
			const res = await client.get("/api/dashboard");
			const { notifications } = res.body.data;

			expect(Array.isArray(notifications)).toBe(true);
			if (notifications.length > 0) {
				expect(notifications[0].id).toBeDefined();
				expect(notifications[0].message).toBeDefined();
			}
		});

		it("should return streak counter as a number", async () => {
			const res = await client.get("/api/dashboard");
			const { streakCounter } = res.body.data;

			expect(typeof streakCounter).toBe("number");
			expect(streakCounter).toBeGreaterThanOrEqual(0);
		});
	});
});
