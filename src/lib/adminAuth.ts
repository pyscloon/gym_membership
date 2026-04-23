import { supabase } from "./supabaseClient";

type AdminAuthResponse = {
  isAdmin: boolean;
  email: string | null;
};

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
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data) {
    return { isAdmin: false, email: null };
  }

  return {
    isAdmin: Boolean(data.is_admin),
    email: user.email ?? null,
  };
}
