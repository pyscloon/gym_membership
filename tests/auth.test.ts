const request = require("supertest");
const { describe, it, expect } = require("@jest/globals");

async function getApp() {
	const appModule = await import("../server/index.js");
	return appModule.default;
}

async function getClient() {
	return request(await getApp());
}

describe("API Integration Tests", () => {
	describe("GET /api/health", () => {
		it("should return 200 with expected health payload", async () => {
			const client = await getClient();
			const res = await client.get("/api/health");

			expect(res.statusCode).toEqual(200);
			expect(res.body.status).toBe("ok");
			expect(res.body.message).toBe("Express server is running.");
			expect(res.body.allowedOrigin).toBeDefined();
		});

		it("should include CORS headers for configured origin", async () => {
			const client = await getClient();
			const origin = process.env.CLIENT_ORIGIN || "http://localhost:5173";

			const res = await client.get("/api/health").set("Origin", origin);

			expect(res.statusCode).toEqual(200);
			expect(res.headers["access-control-allow-origin"]).toBe(origin);
			expect(res.headers["access-control-allow-credentials"]).toBe("true");
		});

		it("should return 404 for unknown routes", async () => {
			const client = await getClient();
			const res = await client.get("/api/unknown-route");

			expect(res.statusCode).toEqual(404);
		});
	});
});