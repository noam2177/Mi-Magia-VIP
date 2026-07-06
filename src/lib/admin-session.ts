// Real admin authentication backed by Supabase Auth + user_roles table.
// No credentials are stored in the client bundle. Admin status is derived
// from a `has_role`-backed RLS check server-side.

import { supabase } from "@/integrations/supabase/client";

export type AdminUser = { id: string; email: string };

/** Check the current session and confirm it belongs to an admin. */
export async function getAdminUser(): Promise<AdminUser | null> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) return null;

  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (error) {
    console.error("[admin-session] role check failed", error.message);
    return null;
  }
  if (!data) return null;
  return { id: user.id, email: user.email ?? "" };
}

/** Sign in and confirm admin role. Returns an error message or null. */
export async function adminLoginWithPassword(
  email: string,
  password: string,
): Promise<string | null> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (/invalid login credentials/i.test(error.message)) {
      return "פרטי התחברות שגויים";
    }
    return error.message;
  }
  const admin = await getAdminUser();
  if (!admin) {
    await supabase.auth.signOut();
    return "אין הרשאת מנהל למשתמש זה";
  }
  return null;
}

export async function adminLogout(): Promise<void> {
  await supabase.auth.signOut();
}
