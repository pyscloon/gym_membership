import { createClient } from "@supabase/supabase-js";
import { isTestSupabaseConfigured, testSupabase, testSupabaseConfig } from "./testSupabaseClient";

declare const __SUPABASE_URL__: string | undefined;
declare const __SUPABASE_ANON_KEY__: string | undefined;
declare const __APP_IS_TEST__: boolean | undefined;

const runtimeEnv = globalThis as typeof globalThis & {
  process?: { env?: Record<string, string | undefined> };
};

const isAppTest =
  typeof __APP_IS_TEST__ !== "undefined"
    ? __APP_IS_TEST__
    : runtimeEnv.process?.env?.NODE_ENV === "test";

const supabaseUrl =
  typeof __SUPABASE_URL__ !== "undefined" && __SUPABASE_URL__
    ? __SUPABASE_URL__
    : runtimeEnv.process?.env?.VITE_SUPABASE_URL;
const supabaseAnonKey =
  typeof __SUPABASE_ANON_KEY__ !== "undefined" && __SUPABASE_ANON_KEY__
    ? __SUPABASE_ANON_KEY__
    : runtimeEnv.process?.env?.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = isAppTest
  ? isTestSupabaseConfigured
  : Boolean(supabaseUrl && supabaseAnonKey);

export const supabaseConfig = isAppTest
  ? {
      ...testSupabaseConfig,
      source: "test",
    }
  : {
      url: supabaseUrl,
      anonKey: supabaseAnonKey,
      source: "default",
    };

export const supabase: any = isAppTest
  ? testSupabase
  : isSupabaseConfigured
    ? createClient(supabaseUrl!, supabaseAnonKey!)
    : null;
