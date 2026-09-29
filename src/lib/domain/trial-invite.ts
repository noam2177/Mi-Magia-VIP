import { phoneToWaMe } from "./phone";

export type TrialInviteChannel = "whatsapp" | "email" | "phone";

export function buildTrialInviteMessage(guestName: string, rsvpUrl: string): string {
  const name = guestName.trim() || "חבר/ה";
  return `שלום ${name},\nנשמח לראותכם באירוע שלנו.\nאישור הגעה כאן: ${rsvpUrl}\nתודה!`;
}

export function buildTrialInviteActionUrl(args: {
  channel: TrialInviteChannel;
  guestName: string;
  rsvpUrl: string;
  guestPhone?: string;
  guestEmail?: string;
  organizerEmail?: string;
}): string | null {
  const body = buildTrialInviteMessage(args.guestName, args.rsvpUrl);

  if (args.channel === "whatsapp") {
    const wa = phoneToWaMe(args.guestPhone);
    if (!wa) return null;
    return `https://wa.me/${wa}?text=${encodeURIComponent(body)}`;
  }

  if (args.channel === "email") {
    const to = args.guestEmail?.trim();
    if (!to) return null;
    const subject = encodeURIComponent("הזמנה לאירוע — אישור הגעה");
    return `mailto:${to}?subject=${subject}&body=${encodeURIComponent(body)}`;
  }

  if (args.channel === "phone") {
    const tel = phoneToWaMe(args.guestPhone);
    if (!tel) return null;
    return `tel:+${tel}`;
  }

  return null;
}
