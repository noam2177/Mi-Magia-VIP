const prefix = "rsvp_submitted_v1";

function keyFor(slug: string) {
  return `${prefix}:${slug}`;
}

/** Tracks guest RSVP completion per event slug (localStorage). */
export function markRsvpSubmitted(slug: string, id: string) {
  if (typeof window !== "undefined") localStorage.setItem(keyFor(slug), id);
}

export function getRsvpSubmitted(slug: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(keyFor(slug));
}

/** Legacy single-event key before slug-scoped storage. */
export function migrateLegacyRsvpCookie(slug: string) {
  if (typeof window === "undefined") return;
  const legacy = localStorage.getItem(prefix);
  if (legacy && !localStorage.getItem(keyFor(slug))) {
    localStorage.setItem(keyFor(slug), legacy);
  }
}
