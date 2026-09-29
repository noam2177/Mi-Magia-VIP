/**
 * Guest message templates (invite / reminder / map / thanks).
 * Ported in spirit from mi-magia-vip `messageTemplates.ts`, rewritten as pure,
 * testable functions with a guest RSVP link (token URL, never guest_id).
 */

export type MessageType = "invite" | "reminder" | "map" | "thanks";

import type { MessageTone } from "./event-template-defaults";
import { inviteLineForTemplate } from "./event-template-defaults";

export type EventMessageContext = {
  eventName: string;
  /** ISO date string or null */
  eventDate?: string | null;
  locationName?: string | null;
  mapsUrl?: string | null;
  /** Guest personal RSVP link (token based) */
  rsvpUrl?: string | null;
  /** טון הודעה — נגזר מקהל + סוג אירוע */
  tone?: MessageTone;
};

export const MESSAGE_TYPE_LABELS: Record<MessageType, string> = {
  invite: "הזמנה",
  reminder: "תזכורת",
  map: "ניווט",
  thanks: "תודה",
};

export function formatEventDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("he-IL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jerusalem",
  });
}

function compact(lines: Array<string | null | undefined | false>): string {
  return lines.filter((l): l is string => typeof l === "string" && l.length > 0).join("\n");
}

export function buildGuestMessage(
  type: MessageType,
  ctx: EventMessageContext,
  guestName: string,
): string {
  const name = guestName.trim() || "חבר/ה";
  const date = formatEventDate(ctx.eventDate);
  const where = ctx.locationName?.trim();

  switch (type) {
    case "invite":
      return compact([
        `שלום ${name},`,
        `מזמינים אותך ל${ctx.eventName}!`,
        date && `📅 ${date}`,
        where && `📍 ${where}`,
        ctx.rsvpUrl && `לאישור הגעה (לוקח דקה): ${ctx.rsvpUrl}`,
        ctx.mapsUrl && `🗺️ ניווט: ${ctx.mapsUrl}`,
      ]);
    case "reminder":
      return compact([
        `היי ${name},`,
        `תזכורת: ${ctx.eventName} מתקרב.`,
        date && `📅 ${date}`,
        where && `📍 ${where}`,
        ctx.rsvpUrl && `עוד לא אישרתם? ${ctx.rsvpUrl}`,
      ]);
    case "map":
      return compact([
        `היי ${name}, הנה הדרך ל${ctx.eventName}:`,
        where && `📍 ${where}`,
        ctx.mapsUrl ? `🗺️ ${ctx.mapsUrl}` : "נשלח קישור ניווט בהמשך.",
        "נסיעה טובה!",
      ]);
    case "thanks":
      return compact([
        `${name}, תודה שהגעת ל${ctx.eventName}! 💗`,
        "היה לנו כיף לחגוג איתך.",
      ]);
  }
}

export function buildWhatsAppUrl(waMePhone: string | null, text: string): string | null {
  if (!waMePhone) return null;
  return `https://wa.me/${waMePhone}?text=${encodeURIComponent(text)}`;
}
