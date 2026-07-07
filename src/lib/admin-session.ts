// Client-side admin "session" — name + hardcoded password (per user request).
// NOTE: not a real security boundary; the credentials are in the client bundle.

const KEY = "rsvp_admin_session_v1";
const ALLOWED_NAMES = ["נעם", "דניאל", "תומר"];
const PASSWORD = "123456";

export type AdminUser = { id: string; email: string };

export function adminLogin(name: string, password: string): string | null {
  const trimmed = name.trim();
  if (!ALLOWED_NAMES.includes(trimmed)) return "שם לא מורשה";
  if (password !== PASSWORD) return "סיסמה שגויה";
  if (typeof window !== "undefined") {
    sessionStorage.setItem(KEY, JSON.stringify({ name: trimmed, at: Date.now() }));
  }
  return null;
}

export async function adminLogout(): Promise<void> {
  if (typeof window !== "undefined") sessionStorage.removeItem(KEY);
}

export function getAdminSession(): { name: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Compatibility wrapper — used by existing components that expect an async AdminUser lookup. */
export async function getAdminUser(): Promise<AdminUser | null> {
  const s = getAdminSession();
  if (!s) return null;
  return { id: s.name, email: s.name };
}
