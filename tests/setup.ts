import dotenv from "dotenv";

dotenv.config({ path: ".env.test" });

const REQUIRED_ENV = ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY", "VITE_ADMIN_EMAIL"];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    throw new Error(`Missing required env variable: ${key}`);
  }
}