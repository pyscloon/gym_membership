import dotenv from "dotenv";

// If running in CI (GITHUB_ACTIONS=true), skip .env.test
const isCI = process.env.GITHUB_ACTIONS === "true";

if (!isCI) {
  // Load local test env vars
  dotenv.config({ path: ".env.test" });
}

// Now validate required env vars
const REQUIRED_ENV = ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY", "VITE_ADMIN_EMAIL"];
const missingVars = REQUIRED_ENV.filter((key) => !process.env[key]);

if (missingVars.length > 0) {
  throw new Error(`Missing required env variable(s): ${missingVars.join(", ")}`);
}