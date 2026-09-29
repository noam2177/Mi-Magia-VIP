import type { EventTypeId } from "@/lib/domain/onboarding";

export const AUDIENCE_SEGMENTS = [
  {
    title: "זוגות ומשפחות",
    description:
      "חתונה, אירוסין או ברית — רוצים רשימה אחת, אחוז מענה ברור, ופחות טלפונים ביום האירוע.",
  },
  {
    title: "הורים לבר/בת מצווה",
    description:
      "רשימת מוזמנים גדולה, עדכונים ב-WhatsApp ומייל, ותזכורות לפני האירוע בלי גיליון משותף.",
  },
  {
    title: "מארגני אירוע קהילתי",
    description:
      "הרצאה, מסיבה או אירוע ציבורי — ייבוא אורחים, מעקב מי אישר, ושידור הודעה לכל הנרשמים.",
  },
] as const;

export type EventTypeCard = {
  id: EventTypeId;
  label: string;
  blurb: string;
  fit: string;
};

export const EVENT_TYPE_CARDS: EventTypeCard[] = [
  {
    id: "wedding",
    label: "חתונה",
    blurb: "הזמנה דיגיטלית, RSVP, לינה וברכות — כמו בדמו החי שלנו.",
    fit: "זוגות שרוצים חוויית אורח חמה ואדמין מסודר.",
  },
  {
    id: "bar_bat_mitzvah",
    label: "בר/בת מצווה",
    blurb: "רשימה ארוכה, הורים מעורבים, תזכורות לפני האירוע.",
    fit: "משפחות עם מאות מוזמנים וצורך בסדר.",
  },
  {
    id: "brit",
    label: "ברית / בריתה",
    blurb: "הזמנה קצרה, מיקום ושעה, אישור הגעה מהיר.",
    fit: "אירוע משפחתי צפוף בזמן.",
  },
  {
    id: "engagement",
    label: "אירוסין",
    blurb: "אירוע קטן או גדול — אותה מערכת RSVP ומעקב.",
    fit: "זוגות בשלב לפני החתונה.",
  },
  {
    id: "community",
    label: "אירוע קהילתי",
    blurb: "כנס, גala או מפגש — ייבוא רשימה ודוח מענה.",
    fit: "עמותות, קהילות ומארגנים מקצועיים קלים.",
  },
  {
    id: "other",
    label: "אחר",
    blurb: "ימי הולדת, מסיבות חברה, כל אירוע עם רשימת מוזמנים.",
    fit: "כל מי שצריך «מי מגיע» בלי אקסל.",
  },
];

export const CHANNEL_ESCALATION_NOTE =
  "ברירת מחדל: WhatsApp → מייל → שיחה. אפשר לבחור סדר אחר (למשל מייל קודם) — המחשבון מתאים את העלות.";
