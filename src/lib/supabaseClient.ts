import { createClient } from "@supabase/supabase-js";

declare const __SUPABASE_URL__: string | undefined;
declare const __SUPABASE_ANON_KEY__: string | undefined;

const runtimeEnv = globalThis as typeof globalThis & {
  process?: { env?: Record<string, string | undefined> };
};

const supabaseUrl =
  typeof __SUPABASE_URL__ !== "undefined" && __SUPABASE_URL__
    ? __SUPABASE_URL__
    : runtimeEnv.process?.env?.VITE_SUPABASE_URL;
const supabaseAnonKey =
  typeof __SUPABASE_ANON_KEY__ !== "undefined" && __SUPABASE_ANON_KEY__
    ? __SUPABASE_ANON_KEY__
    : runtimeEnv.process?.env?.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabaseConfig = {
  url: supabaseUrl,
  anonKey: supabaseAnonKey,
};

export const supabase: any = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;
