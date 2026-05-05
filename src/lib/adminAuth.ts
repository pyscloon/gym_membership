import { supabase } from "./supabaseClient";

type AdminAuthResponse = {
  isAdmin: boolean;
  email: string | null;
};

const runtimeEnv = globalThis as typeof globalThis & {
  process?: { env?: Record<string, string | undefined> };
};

const configuredAdminEmail = (
  import.meta.env.VITE_ADMIN_EMAIL ??
  runtimeEnv.process?.env?.VITE_ADMIN_EMAIL ??
  ""
).toLowerCase();

export async function verifyAdminAccess(): Promise<AdminAuthResponse> {
  if (!supabase) {
    return { isAdmin: false, email: null };
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData.session?.user) {
    return { isAdmin: false, email: null };
  }

  const user = sessionData.session.user;
  const { data, error } = await supabase
    .from("profiles")
    .select("is_admin, role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return {
      isAdmin: (user.email ?? "").toLowerCase() === configuredAdminEmail,
      email: user.email ?? null,
    };
  }

  if (!data) {
    return {
      isAdmin: (user.email ?? "").toLowerCase() === configuredAdminEmail,
      email: user.email ?? null,
    };
  }

  return {
    isAdmin: Boolean(data.is_admin) || data.role === "admin" || (user.email ?? "").toLowerCase() === configuredAdminEmail,
    email: user.email ?? null,
  };
}
