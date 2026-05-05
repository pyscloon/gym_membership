import { createClient } from "@supabase/supabase-js";

declare const __SUPABASE_URL__: string | undefined;
declare const __SUPABASE_ANON_KEY__: string | undefined;
declare const __TEST_SUPABASE_URL__: string | undefined;
declare const __TEST_SUPABASE_ANON_KEY__: string | undefined;
declare const __APP_IS_TEST__: boolean | undefined;

const runtimeEnv = globalThis as typeof globalThis & {
  process?: { env?: Record<string, string | undefined> };
};

const isAppTest =
  typeof __APP_IS_TEST__ !== "undefined"
    ? __APP_IS_TEST__
    : runtimeEnv.process?.env?.NODE_ENV === "test";

// Config for production/dev
const prodUrl =
  typeof __SUPABASE_URL__ !== "undefined" && __SUPABASE_URL__
    ? __SUPABASE_URL__
    : runtimeEnv.process?.env?.VITE_SUPABASE_URL;
const prodAnonKey =
  typeof __SUPABASE_ANON_KEY__ !== "undefined" && __SUPABASE_ANON_KEY__
    ? __SUPABASE_ANON_KEY__
    : runtimeEnv.process?.env?.VITE_SUPABASE_ANON_KEY;

// Config for test
const testUrl =
  typeof __TEST_SUPABASE_URL__ !== "undefined" && __TEST_SUPABASE_URL__
    ? __TEST_SUPABASE_URL__
    : runtimeEnv.process?.env?.VITE_SUPABASE_URL;
const testAnonKey =
  typeof __TEST_SUPABASE_ANON_KEY__ !== "undefined" && __TEST_SUPABASE_ANON_KEY__
    ? __TEST_SUPABASE_ANON_KEY__
    : runtimeEnv.process?.env?.VITE_SUPABASE_ANON_KEY;

// Determine which config to use
const activeUrl = isAppTest ? (testUrl || prodUrl) : prodUrl;
const activeAnonKey = isAppTest ? (testAnonKey || prodAnonKey) : prodAnonKey;

export const isSupabaseConfigured = Boolean(activeUrl && activeAnonKey);

export const supabaseConfig = {
  url: activeUrl,
  anonKey: activeAnonKey,
  source: isAppTest ? "test" : "default",
};

export const supabase: any = isSupabaseConfigured
  ? createClient(activeUrl!, activeAnonKey!)
  : null;
