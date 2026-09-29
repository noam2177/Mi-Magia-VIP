// Client-side admin "session" — name + hardcoded password (per user request).
// NOTE: not a real security boundary; warned the user.
const KEY = "rsvp_admin_session_v1";
const ALLOWED_NAMES = ["נעם", "דניאל", "תומר"];
const PASSWORD = "123456";

export function adminLogin(name: string, password: string): string | null {
  if (!ALLOWED_NAMES.includes(name.trim())) return "שם לא מורשה";
  if (password !== PASSWORD) return "סיסמה שגויה";
  if (typeof window !== "undefined") {
    sessionStorage.setItem(KEY, JSON.stringify({ name: name.trim(), at: Date.now() }));
  }
  return null;
}

export function adminLogout() {
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
