import type { EventTypeId, OrganizerAudienceId } from "@/lib/domain/event-template-defaults";
import { EVENT_TYPES, ORGANIZER_AUDIENCES } from "@/lib/domain/event-template-defaults";

export const AUDIENCE_SEGMENTS = [
  {
    id: "couples_families" as OrganizerAudienceId,
    title: "זוגות ומשפחות",
    description:
      "חתונה, אירוסין או ברית — רשימה אחת, אחוז מענה ברור, ופחות טלפונים ביום האירוע.",
  },
  {
    id: "parents_celebration" as OrganizerAudienceId,
    title: "הורים לבר/בת מצווה",
    description:
      "רשימת מוזמנים גדולה, עדכונים ב-WhatsApp ומייל, ותזכורות לפני האירוע בלי גיליון משותף.",
  },
  {
    id: "community" as OrganizerAudienceId,
    title: "מארגני אירוע קהילתי",
    description:
      "הרצאה, מסיבה או אירוע ציבורי — ייבוא אורחים, מעקב מי אישר, ושידור הודעה לכל הנרשמים.",
  },
  {
    id: "business" as OrganizerAudienceId,
    title: "קהל עסקי",
    description:
      "אירוע חברה, כנס או השקה — טון מקצועי, מייל כברירת מחדל, RSVP ללקוחות ועובדים בלי אקסל.",
  },
] as const;

const EVENT_BLURBS: Record<EventTypeId, { blurb: string; fit: string }> = {
  wedding: {
    blurb: "הזמנה דיגיטלית, RSVP, לינה וברכות — כמו בדמו החי שלנו.",
    fit: "זוגות שרוצים חוויית אורח חמה ואדמין מסודר.",
  },
  bar_bat_mitzvah: {
    blurb: "רשימה ארוכה, הורים מעורבים, תזכורות לפני האירוע.",
    fit: "משפחות עם מאות מוזמנים וצורך בסדר.",
  },
  brit: {
    blurb: "הזמנה קצרה, מיקום ושעה, אישור הגעה מהיר.",
    fit: "אירוע משפחתי צפוף בזמן.",
  },
  engagement: {
    blurb: "אירוע קטן או גדול — אותה מערכת RSVP ומעקב.",
    fit: "זוגות בשלב לפני החתונה.",
  },
  community: {
    blurb: "כנס, גala או מפגש — ייבוא רשימה ודוח מענה.",
    fit: "עמותות, קהילות ומארגנים מקצועיים קלים.",
  },
  corporate: {
    blurb: "ערב צוות, יום גיבוש או מפגש חברה — הזמנה במייל, מעקב מענה.",
    fit: "HR, מנהלי משרד ומארגני אירועים פנימיים.",
  },
  conference: {
    blurb: "כנס, השקת מוצר או מפגש לקוחות — טון רשמי ותזכורות מסודרות.",
    fit: "שיווק, מוצר וצוותים שמזמינים מאות משתתפים.",
  },
  other: {
    blurb: "ימי הולדת, מסיבות או כל אירוע עם רשימת מוזמנים.",
    fit: "כל מי שצריך «מי מגיע» בלי אקסל.",
  },
};

export type EventTypeCard = {
  id: EventTypeId;
  label: string;
  blurb: string;
  fit: string;
};

export const EVENT_TYPE_CARDS: EventTypeCard[] = EVENT_TYPES.map((t) => ({
  id: t.id,
  label: t.label,
  ...EVENT_BLURBS[t.id],
}));

export const CHANNEL_ESCALATION_NOTE =
  "ברירת מחדל משפחתית: WhatsApp → מייל → שיחה. לעסקים וקהילה: מייל קודם — המחשבון והטמפלט מתאימים את עצמם לקהל שבחרתם.";

export { ORGANIZER_AUDIENCES };
