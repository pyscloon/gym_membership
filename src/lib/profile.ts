import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabaseClient";

type SyncProfileInput = {
  user: User;
  full_name?: string;
};

export async function syncProfile({ user, full_name
 }: SyncProfileInput) {
  if (!supabase) {
    return { error: "Supabase client is not available." };
  }

  const resolvedfull_name =
    full_name ??
    [user.user_metadata?.first_name, user.user_metadata?.last_name]
      .filter(Boolean)
      .join(" ")
      .trim();

  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      full_name
: resolvedfull_name
 || user.email || "",
      email: user.email || "",
      created_at: new Date().toISOString(),
    },
    {
      onConflict: "id",
    }
  );

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}