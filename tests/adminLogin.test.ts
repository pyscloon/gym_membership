import request from "supertest";
import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { spawn } from "child_process";

const port = process.env.PORT || "4001";
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

describe("Admin Login API Integration Tests", () => {
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

	describe("POST /api/admin/login", () => {
		it("should return 400 when email or password is missing", async () => {
			const res = await client.post("/api/admin/login").send({ email: "" });

			expect(res.statusCode).toEqual(400);
			expect(res.body.status).toBe("error");
			expect(res.body.message).toBe("Please enter admin email and password.");
		});

		it("should return 403 when account is not allowed for admin portal", async () => {
			const res = await client.post("/api/admin/login").send({
				email: "member@example.com",
				password: "secret",
			});

			expect(res.statusCode).toEqual(403);
			expect(res.body.status).toBe("error");
			expect(res.body.message).toBe("This account is not allowed to access the admin portal.");
		});

		it("should return 200 for allowed admin email", async () => {
			const res = await client.post("/api/admin/login").send({
				email: "ADMIN@EXAMPLE.COM",
				password: "secret",
			});

			expect(res.statusCode).toEqual(200);
			expect(res.body.status).toBe("ok");
			expect(res.body.message).toBe("Admin credentials accepted.");
			expect(res.body.adminEmail).toBe(adminEmail);
		});
	});
});
