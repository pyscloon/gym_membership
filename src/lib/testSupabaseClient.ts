import { createClient } from "@supabase/supabase-js";

declare const __TEST_SUPABASE_URL__: string | undefined;
declare const __TEST_SUPABASE_ANON_KEY__: string | undefined;

const runtimeEnv = globalThis as typeof globalThis & {
  process?: { env?: Record<string, string | undefined> };
};

const testSupabaseUrl =
  typeof __TEST_SUPABASE_URL__ !== "undefined" && __TEST_SUPABASE_URL__
    ? __TEST_SUPABASE_URL__
    : runtimeEnv.process?.env?.VITE_SUPABASE_URL;
const testSupabaseAnonKey =
  typeof __TEST_SUPABASE_ANON_KEY__ !== "undefined" && __TEST_SUPABASE_ANON_KEY__
    ? __TEST_SUPABASE_ANON_KEY__
    : runtimeEnv.process?.env?.VITE_SUPABASE_ANON_KEY;

export const isTestSupabaseConfigured = Boolean(testSupabaseUrl && testSupabaseAnonKey);

export const testSupabaseConfig = {
  url: testSupabaseUrl,
  anonKey: testSupabaseAnonKey,
};

export const testSupabase: any = isTestSupabaseConfigured
  ? createClient(testSupabaseUrl!, testSupabaseAnonKey!)
  : null;
