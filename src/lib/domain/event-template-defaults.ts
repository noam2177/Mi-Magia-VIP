import type { InviteChannels } from "./pricing";

/** רמה ראשונה — אישי מול עסקי */
export const EVENT_CATEGORIES = [
  { id: "personal", label: "אירועים אישיים ומשפחתיים", description: "חתונות, מצווה, ברית, מסיבות רווקות ועוד" },
  { id: "business", label: "אירועים עסקיים", description: "חברה, כנס, לקוחות והשקות" },
] as const;

export type EventCategoryId = (typeof EVENT_CATEGORIES)[number]["id"];

/** @deprecated — נשמר לתאימות בהערות; העדפה: event_category */
export type OrganizerAudienceId =
  | "couples_families"
  | "parents_celebration"
  | "community"
  | "business";

export const ORGANIZER_AUDIENCES = [
  { id: "couples_families" as OrganizerAudienceId, label: "זוגות ומשפחות" },
  { id: "parents_celebration" as OrganizerAudienceId, label: "הורים" },
  { id: "community" as OrganizerAudienceId, label: "קהילה" },
  { id: "business" as OrganizerAudienceId, label: "עסקים" },
];

export type EventTypeId =
  | "wedding"
  | "bachelor_party"
  | "bachelorette_party"
  | "engagement"
  | "bar_mitzvah"
  | "bat_mitzvah"
  | "brit"
  | "brita"
  | "community"
  | "corporate"
  | "conference"
  | "networking"
  | "product_launch"
  | "other";

export const EVENT_TYPES = [
  { id: "wedding", label: "חתונה", category: "personal" as EventCategoryId, featured: true },
  { id: "bachelor_party", label: "מסיבת רווקים", category: "personal", featured: false },
  { id: "bachelorette_party", label: "מסיבת רווקות", category: "personal", featured: false },
  { id: "engagement", label: "אירוסין", category: "personal", featured: false },
  { id: "bar_mitzvah", label: "בר מצווה", category: "personal", featured: false },
  { id: "bat_mitzvah", label: "בת מצווה", category: "personal", featured: false },
  { id: "brit", label: "ברית", category: "personal", featured: false },
  { id: "brita", label: "בריתה", category: "personal", featured: false },
  { id: "community", label: "אירוע קהילתי", category: "personal", featured: false },
  { id: "corporate", label: "אירוע חברה / צוות", category: "business", featured: false },
  { id: "conference", label: "כנס / יום עיון", category: "business", featured: false },
  { id: "networking", label: "נטוורקינג / מפגש לקוחות", category: "business", featured: false },
  { id: "product_launch", label: "השקת מוצר", category: "business", featured: false },
  { id: "other", label: "אחר (טמפלט בסיסי)", category: "personal", featured: false },
  { id: "other", label: "אחר (טמפלט בסיסי)", category: "business", featured: false },
] as const;

export type MessageTone = "warm" | "neutral" | "professional" | "festive";

export type TemplateVisual = {
  icon: string;
  gradient: string;
  border: string;
  titleClass: string;
  badge?: string;
};

export type EventTemplateDefaults = {
  category: EventCategoryId;
  eventType: EventTypeId;
  sampleLandingTitle: string;
  sampleSubtitle: string;
  tone: MessageTone;
  visual: TemplateVisual;
  defaultChannels: InviteChannels;
  channelOrder: Array<"whatsapp" | "email" | "phone">;
  channelOrderLabel: string;
  partnerFieldLabel: string;
  rsvpHint: string;
};

const TONE_INVITE: Record<MessageTone, (eventName: string) => string> = {
  warm: (name) => `מזמינים אותך ל${name}!`,
  neutral: (name) => `הנך/י מוזמן/ת ל${name}.`,
  professional: (name) => `נשמח לראותך ב${name}.`,
  festive: (name) => `בואו לחגוג איתנו ב${name}! 🎉`,
};

export function inviteLineForTemplate(tone: MessageTone, eventName: string): string {
  return TONE_INVITE[tone](eventName);
}

function tpl(
  category: EventCategoryId,
  eventType: EventTypeId,
  partial: Omit<EventTemplateDefaults, "category" | "eventType">,
): EventTemplateDefaults {
  return { category, eventType, ...partial };
}

const TEMPLATES: EventTemplateDefaults[] = [
  tpl("personal", "wedding", {
    sampleLandingTitle: "החתונה שלנו",
    sampleSubtitle: "נשמח לחגוג איתכם — אישור הגעה, לינה ופרטים במקום אחד",
    tone: "warm",
    visual: {
      icon: "💒",
      gradient: "from-rose-100 via-pink-50 to-amber-50",
      border: "border-rose-200",
      titleClass: "text-rose-950",
      badge: "הדגש שלנו כרגע",
    },
    defaultChannels: { whatsapp: true, email: true, phone: false },
    channelOrder: ["whatsapp", "email", "phone"],
    channelOrderLabel: "WhatsApp → מייל → שיחה",
    partnerFieldLabel: "בן/בת זוג (לשיתוף)",
    rsvpHint: "מספר אורחים, לינה, ברכה",
  }),
  tpl("personal", "bachelor_party", {
    sampleLandingTitle: "מסיבת הרווקים",
    sampleSubtitle: "מי מגיע לערב? אישור מהיר בלי שרשור בקבוצה",
    tone: "festive",
    visual: { icon: "🎉", gradient: "from-sky-100 to-indigo-50", border: "border-sky-200", titleClass: "text-sky-950" },
    defaultChannels: { whatsapp: true, email: false, phone: false },
    channelOrder: ["whatsapp", "email", "phone"],
    channelOrderLabel: "WhatsApp → מייל",
    partnerFieldLabel: "חבר/ה מארגן/ת",
    rsvpHint: "מגיע / לא מגיע",
  }),
  tpl("personal", "bachelorette_party", {
    sampleLandingTitle: "מסיבת הרווקות",
    sampleSubtitle: "רשימה סגורה, עדכונים ו-RSVP בנגיעה אחת",
    tone: "festive",
    visual: { icon: "💃", gradient: "from-fuchsia-100 to-pink-50", border: "border-fuchsia-200", titleClass: "text-fuchsia-950" },
    defaultChannels: { whatsapp: true, email: false, phone: false },
    channelOrder: ["whatsapp", "email", "phone"],
    channelOrderLabel: "WhatsApp → מייל",
    partnerFieldLabel: "חברה מארגנת",
    rsvpHint: "מגיעה / לא מגיעה",
  }),
  tpl("personal", "engagement", {
    sampleLandingTitle: "אירוסינו",
    sampleSubtitle: "הזמנה חמה ואישור הגעה פשוט",
    tone: "warm",
    visual: { icon: "💍", gradient: "from-amber-50 to-rose-50", border: "border-amber-200", titleClass: "text-amber-950" },
    defaultChannels: { whatsapp: true, email: true, phone: false },
    channelOrder: ["whatsapp", "email", "phone"],
    channelOrderLabel: "WhatsApp → מייל → שיחה",
    partnerFieldLabel: "בן/בת זוג",
    rsvpHint: "אישור הגעה",
  }),
  tpl("personal", "bar_mitzvah", {
    sampleLandingTitle: "בר המצווה של…",
    sampleSubtitle: "עיצוב כחול־זהב, רשימת מוזמנים ומענה חי",
    tone: "neutral",
    visual: { icon: "✡️", gradient: "from-blue-100 to-slate-50", border: "border-blue-300", titleClass: "text-blue-950" },
    defaultChannels: { whatsapp: true, email: true, phone: false },
    channelOrder: ["whatsapp", "email", "phone"],
    channelOrderLabel: "WhatsApp → מייל → שיחה",
    partnerFieldLabel: "הורה שני/ה",
    rsvpHint: "מספר מלווים, העדפות אוכל",
  }),
  tpl("personal", "bat_mitzvah", {
    sampleLandingTitle: "בת המצווה של…",
    sampleSubtitle: "עיצוב ורוד־לילך — אותה מערכת, טון מותאם לבת",
    tone: "neutral",
    visual: { icon: "🌸", gradient: "from-violet-100 to-pink-50", border: "border-violet-200", titleClass: "text-violet-950" },
    defaultChannels: { whatsapp: true, email: true, phone: false },
    channelOrder: ["whatsapp", "email", "phone"],
    channelOrderLabel: "WhatsApp → מייל → שיחה",
    partnerFieldLabel: "הורה שני/ה",
    rsvpHint: "מספר מלווים, העדפות אוכל",
  }),
  tpl("personal", "brit", {
    sampleLandingTitle: "שמחת הברית",
    sampleSubtitle: "הזמנה קצרה, מיקום ושעה",
    tone: "warm",
    visual: { icon: "👶", gradient: "from-sky-50 to-emerald-50", border: "border-sky-200", titleClass: "text-sky-900" },
    defaultChannels: { whatsapp: true, email: false, phone: false },
    channelOrder: ["whatsapp", "email", "phone"],
    channelOrderLabel: "WhatsApp → מייל",
    partnerFieldLabel: "הורה נוסף/ת",
    rsvpHint: "מגיעים / מספר מלווים",
  }),
  tpl("personal", "brita", {
    sampleLandingTitle: "שמחת הבריתה",
    sampleSubtitle: "גוון עדין ורוד — פרטי האירוע ו-RSVP",
    tone: "warm",
    visual: { icon: "🎀", gradient: "from-pink-50 to-rose-100", border: "border-pink-200", titleClass: "text-pink-900" },
    defaultChannels: { whatsapp: true, email: false, phone: false },
    channelOrder: ["whatsapp", "email", "phone"],
    channelOrderLabel: "WhatsApp → מייל",
    partnerFieldLabel: "הורה נוסף/ת",
    rsvpHint: "מגיעים / מספר מלווים",
  }),
  tpl("personal", "community", {
    sampleLandingTitle: "האירוע הקהילתי",
    sampleSubtitle: "ייבוא רשימה, שידור ודוח מענה",
    tone: "neutral",
    visual: { icon: "🤝", gradient: "from-teal-50 to-white", border: "border-teal-200", titleClass: "text-teal-950" },
    defaultChannels: { whatsapp: true, email: true, phone: false },
    channelOrder: ["email", "whatsapp", "phone"],
    channelOrderLabel: "מייל → WhatsApp → שיחה",
    partnerFieldLabel: "איש קשר",
    rsvpHint: "הרשמה / הגעה",
  }),
  tpl("business", "corporate", {
    sampleLandingTitle: "אירוע הצוות",
    sampleSubtitle: "טון מקצועי, מייל כברירת מחדל",
    tone: "professional",
    visual: { icon: "🏢", gradient: "from-slate-100 to-white", border: "border-slate-300", titleClass: "text-slate-900" },
    defaultChannels: { whatsapp: false, email: true, phone: false },
    channelOrder: ["email", "whatsapp", "phone"],
    channelOrderLabel: "מייל → WhatsApp → שיחה",
    partnerFieldLabel: "איש קשר בארגון",
    rsvpHint: "אישור השתתפות",
  }),
  tpl("business", "conference", {
    sampleLandingTitle: "הכנס / יום העיון",
    sampleSubtitle: "הרשמה, תזכורות וניווט",
    tone: "professional",
    visual: { icon: "🎤", gradient: "from-indigo-50 to-slate-50", border: "border-indigo-200", titleClass: "text-indigo-950" },
    defaultChannels: { whatsapp: false, email: true, phone: true },
    channelOrder: ["email", "whatsapp", "phone"],
    channelOrderLabel: "מייל → WhatsApp → שיחה",
    partnerFieldLabel: "מנהל/ת פרויקט",
    rsvpHint: "הרשמה + פרטי כניסה",
  }),
  tpl("business", "networking", {
    sampleLandingTitle: "מפגש לקוחות",
    sampleSubtitle: "רשימת מוזמנים ומעקב מי אישר",
    tone: "professional",
    visual: { icon: "🤝", gradient: "from-cyan-50 to-white", border: "border-cyan-200", titleClass: "text-cyan-950" },
    defaultChannels: { whatsapp: false, email: true, phone: false },
    channelOrder: ["email", "whatsapp", "phone"],
    channelOrderLabel: "מייל → WhatsApp",
    partnerFieldLabel: "אחראי/ת לקוחות",
    rsvpHint: "אישור הגעה",
  }),
  tpl("business", "product_launch", {
    sampleLandingTitle: "השקת המוצר",
    sampleSubtitle: "הזמנה מעוצבת ומדידת מענה",
    tone: "professional",
    visual: { icon: "🚀", gradient: "from-violet-50 to-indigo-50", border: "border-violet-300", titleClass: "text-violet-950" },
    defaultChannels: { whatsapp: false, email: true, phone: false },
    channelOrder: ["email", "whatsapp", "phone"],
    channelOrderLabel: "מייל → WhatsApp",
    partnerFieldLabel: "מנהל/ת מוצר",
    rsvpHint: "הרשמה לאירוע",
  }),
];

const GENERIC_PERSONAL = tpl("personal", "other", {
  sampleLandingTitle: "האירוע שלנו",
  sampleSubtitle: "טמפלט בסיסי — מתאימים צבעים וטקסט אחרי בחירת סוג",
  tone: "warm",
  visual: { icon: "✨", gradient: "from-pink-50 to-white", border: "border-pink-100", titleClass: "text-pink-950" },
  defaultChannels: { whatsapp: true, email: true, phone: false },
  channelOrder: ["whatsapp", "email", "phone"],
  channelOrderLabel: "WhatsApp → מייל → שיחה",
  partnerFieldLabel: "שותף/ה לאירוע",
  rsvpHint: "אישור הגעה",
});

const GENERIC_BUSINESS = tpl("business", "other", {
  sampleLandingTitle: "אירוע עסקי",
  sampleSubtitle: "טמפלט בסיסי עסקי — ניתן להתאים אחרי ההרשמה",
  tone: "professional",
  visual: { icon: "📋", gradient: "from-gray-100 to-white", border: "border-gray-200", titleClass: "text-gray-900" },
  defaultChannels: { whatsapp: false, email: true, phone: false },
  channelOrder: ["email", "whatsapp", "phone"],
  channelOrderLabel: "מייל → WhatsApp → שיחה",
  partnerFieldLabel: "איש קשר",
  rsvpHint: "אישור השתתפות",
});

const templateIndex = new Map<string, EventTemplateDefaults>(
  TEMPLATES.map((t) => [`${t.category}:${t.eventType}`, t]),
);

export function resolveEventTemplate(
  category: EventCategoryId,
  eventType: EventTypeId,
  displayName?: string | null,
): EventTemplateDefaults {
  const base =
    templateIndex.get(`${category}:${eventType}`) ??
    (category === "business" ? GENERIC_BUSINESS : GENERIC_PERSONAL);
  if (!displayName?.trim()) return base;
  return { ...base, sampleLandingTitle: displayName.trim() };
}

export function eventTypesForCategory(category: EventCategoryId) {
  const seen = new Set<string>();
  return EVENT_TYPES.filter((t) => {
    if (t.category !== category) return false;
    if (seen.has(t.id)) return false;
    seen.add(t.id);
    return true;
  });
}

export function defaultEventTypeForCategory(category: EventCategoryId): EventTypeId {
  if (category === "personal") return "wedding";
  return "corporate";
}

export function featuredPersonalEventTypes() {
  return eventTypesForCategory("personal").filter((t) => t.featured || t.id === "wedding");
}

export function categoryFromLegacyAudience(audience: OrganizerAudienceId): EventCategoryId {
  return audience === "business" ? "business" : "personal";
}

export function legacyAudienceFromCategory(category: EventCategoryId, eventType: EventTypeId): OrganizerAudienceId {
  if (category === "business") return "business";
  if (eventType === "bar_mitzvah" || eventType === "bat_mitzvah") return "parents_celebration";
  if (eventType === "community") return "community";
  return "couples_families";
}

export const EVENT_TYPE_IDS = [...new Set(EVENT_TYPES.map((t) => t.id))] as EventTypeId[];
