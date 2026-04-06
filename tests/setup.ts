const REQUIRED_ENV = ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY", "VITE_ADMIN_EMAIL"];
const missingVars = REQUIRED_ENV.filter((key) => !process.env[key]);

if (missingVars.length > 0) {
  throw new Error(`Missing required env variable(s): ${missingVars.join(", ")}`);
}
