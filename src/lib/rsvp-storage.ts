const KEY = "rsvp_submitted_v1";

export function markRsvpSubmitted(id: string) {
  if (typeof window !== "undefined") localStorage.setItem(KEY, id);
}
export function getRsvpSubmitted(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(KEY);
}
