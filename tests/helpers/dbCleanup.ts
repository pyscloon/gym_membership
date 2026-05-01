import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.test" });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const adminEmail = process.env.TEST_ADMIN_EMAIL || process.env.VITE_ADMIN_EMAIL;
const adminPassword = process.env.TEST_ADMIN_PASSWORD || process.env.VITE_ADMIN_PASSWORD;

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export async function clearTestData() {
  if (!supabase || !adminEmail || !adminPassword) {
    console.warn("Skipping DB cleanup due to missing credentials.");
    return;
  }

  const { error: authError } = await supabase.auth.signInWithPassword({
    email: adminEmail,
    password: adminPassword,
  });

  if (authError) {
    console.error("Failed to authenticate as admin for DB cleanup:", authError);
    return;
  }

  // Delete all memberships first (foreign key constraints might apply)
  await supabase.from("memberships").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  // Delete all profiles except the admin
  await supabase.from("profiles").delete().neq("email", adminEmail);
}
