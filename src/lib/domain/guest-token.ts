/** Guest link tokens — 128-bit, path segment only (R7 / MOD v1.1 fix #1). */

const TOKEN_RE = /^[A-Za-z0-9_-]{22,64}$/;

export function generateGuestToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function isValidGuestTokenFormat(token: string | null | undefined): boolean {
  if (!token || token.includes("?") || /^\d+$/.test(token)) return false;
  return TOKEN_RE.test(token);
}

export function guestPath(token: string): string {
  return `/g/${token}`;
}

/** Absolute guest RSVP URL for WhatsApp templates (never guest_id). */
export function guestRsvpUrl(origin: string, token: string): string {
  const base = (origin || "").replace(/\/$/, "");
  return `${base}${guestPath(token)}`;
}
