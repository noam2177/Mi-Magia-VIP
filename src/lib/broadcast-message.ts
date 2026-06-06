export const DEFAULT_BROADCAST_MESSAGE = `שלום {name}!
שמחים להזמין אתכם לאפטר חתונה של דני ותומר 💗
לפרטים ואישור הגעה: {link}`;

export function formatBroadcastMessage(
  template: string,
  guestName: string,
  inviteLink: string,
): string {
  const name = guestName.trim() || "חבר/ה";
  const link = inviteLink.trim() || (typeof window !== "undefined" ? window.location.origin : "");
  return (template || DEFAULT_BROADCAST_MESSAGE)
    .replaceAll("{name}", name)
    .replaceAll("{link}", link);
}

export function getInviteLink(): string {
  if (typeof window === "undefined") return "";
  return window.location.origin;
}
