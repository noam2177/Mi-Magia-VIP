/**
 * Product brand — single source of truth.
 * Product = «מי מגיע» (Mi-Magia-VIP). Event names (e.g. the daniel-tomer demo) live per event, not here.
 */
export const BRAND = {
  name: "מי מגיע",
  latin: "Mi-Magia-VIP",
  tagline: "הזמנות ואישורי הגעה לחתונות ואירועים",
  description: "רשימת אורחים חיה, אחוז מענה, WhatsApp מייל וטלפון — בלי גיליון ובלי בלגן.",
  mailFrom: "מי מגיע <onboarding@resend.dev>",
} as const;

export function pageTitle(section?: string): string {
  return section ? `${section} — ${BRAND.name}` : `${BRAND.name} — ${BRAND.tagline}`;
}
