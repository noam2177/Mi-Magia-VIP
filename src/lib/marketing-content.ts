import type { EventCategoryId, EventTypeId } from "@/lib/domain/event-template-defaults";
import { EVENT_CATEGORIES, EVENT_TYPES, resolveEventTemplate } from "@/lib/domain/event-template-defaults";

export const CATEGORY_SECTIONS = EVENT_CATEGORIES.map((c) => ({
  id: c.id,
  title: c.label,
  description: c.description,
}));

const EVENT_BLURBS: Partial<Record<EventTypeId, { blurb: string; fit: string }>> = {
  wedding: { blurb: "הדגש שלנו — הזמנה, RSVP, לינה וברכות.", fit: "זוגות ביום הגדול." },
  bachelor_party: { blurb: "רשימה סגורה לערב רווקים.", fit: "חתן וחברים." },
  bachelorette_party: { blurb: "מסיבת רווקות מסודרת.", fit: "כלה וחברות." },
  bar_mitzvah: { blurb: "עיצוב כחול, רשימה ארוכה.", fit: "הורים לבן." },
  bat_mitzvah: { blurb: "עיצוב ורוד־לילך נפרד.", fit: "הורים לבת." },
  brit: { blurb: "ברית — קצר וחם.", fit: "משפחה." },
  brita: { blurb: "בריתה — גוון עדין.", fit: "משפחה." },
  corporate: { blurb: "אירוע חברה במייל.", fit: "HR ומשרד." },
  conference: { blurb: "כנס והרשמה.", fit: "הפקה פנימית." },
  product_launch: { blurb: "השקה למוזמנים מסוננים.", fit: "שיווק ומוצר." },
};

export type EventTypeCard = {
  id: EventTypeId;
  label: string;
  blurb: string;
  fit: string;
  category: EventCategoryId;
  icon: string;
  featured?: boolean;
};

export const EVENT_TYPE_CARDS: EventTypeCard[] = EVENT_TYPES.filter(
  (t, i, arr) => arr.findIndex((x) => x.id === t.id && x.category === t.category) === i,
).map((t) => {
  const tpl = resolveEventTemplate(t.category, t.id);
  const meta = EVENT_BLURBS[t.id] ?? { blurb: tpl.sampleSubtitle, fit: "מתאים לרוב המארגנים." };
  return {
    id: t.id,
    label: t.label,
    category: t.category,
    icon: tpl.visual.icon,
    featured: t.featured,
    ...meta,
  };
});

export const PERSONAL_EVENT_CARDS = EVENT_TYPE_CARDS.filter((c) => c.category === "personal");
export const BUSINESS_EVENT_CARDS = EVENT_TYPE_CARDS.filter((c) => c.category === "business");

export const CHANNEL_ESCALATION_NOTE =
  "משפחה וחתונה: WhatsApp קודם. עסקים: מייל קודם. הטמפלט מתאים ערוצים ועיצוב אוטומטית.";
