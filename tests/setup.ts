import dotenv from "dotenv";

// Load .env.test only if the required env vars are missing (local dev)
const REQUIRED_ENV = ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY", "VITE_ADMIN_EMAIL"];
const missingVars = REQUIRED_ENV.filter((key) => !process.env[key]);

if (missingVars.length > 0) {
  console.log("Loading .env.test for local development...");
  dotenv.config({ path: ".env.test" });
}

// Validate required env variables
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    throw new Error(`Missing required env variable: ${key}`);
  }
}