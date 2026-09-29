import type { InviteChannels } from "./pricing";

/** קהל מארגן — קובע טון, ערוצים וסוגי אירוע מוצעים */
export const ORGANIZER_AUDIENCES = [
  { id: "couples_families", label: "זוגות ומשפחות", marketingTitle: "זוגות ומשפחות" },
  { id: "parents_celebration", label: "הורים (בר/בת מצווה וכד׳)", marketingTitle: "הורים לבר/בת מצווה" },
  { id: "community", label: "קהילה ועמותות", marketingTitle: "מארגני אירוע קהילתי" },
  { id: "business", label: "עסקים וארגונים", marketingTitle: "קהל עסקי" },
] as const;

export type OrganizerAudienceId = (typeof ORGANIZER_AUDIENCES)[number]["id"];

export type EventTypeId =
  | "wedding"
  | "bar_bat_mitzvah"
  | "brit"
  | "engagement"
  | "community"
  | "corporate"
  | "conference"
  | "other";

export const EVENT_TYPES = [
  { id: "wedding", label: "חתונה", audiences: ["couples_families"] as OrganizerAudienceId[] },
  { id: "bar_bat_mitzvah", label: "בר/בת מצווה", audiences: ["parents_celebration"] as OrganizerAudienceId[] },
  { id: "brit", label: "ברית / בריתה", audiences: ["couples_families"] as OrganizerAudienceId[] },
  { id: "engagement", label: "אירוסין", audiences: ["couples_families"] as OrganizerAudienceId[] },
  { id: "community", label: "אירוע קהילתי", audiences: ["community", "couples_families"] as OrganizerAudienceId[] },
  { id: "corporate", label: "אירוע חברה / צוות", audiences: ["business"] as OrganizerAudienceId[] },
  { id: "conference", label: "כנס / השקה / לקוחות", audiences: ["business"] as OrganizerAudienceId[] },
  { id: "other", label: "אחר", audiences: ["couples_families", "parents_celebration", "community", "business"] as OrganizerAudienceId[] },
] as const;

export type MessageTone = "warm" | "neutral" | "professional";

export type EventTemplateDefaults = {
  audience: OrganizerAudienceId;
  eventType: EventTypeId;
  /** כותרת דוגמה לדף אירוע (ניתן לעריכה באדמין) */
  sampleLandingTitle: string;
  tone: MessageTone;
  defaultChannels: InviteChannels;
  /** סדר מומלץ לתיאור בממשק (לא חיוב תמחור) */
  channelOrder: Array<"whatsapp" | "email" | "phone">;
  channelOrderLabel: string;
  partnerFieldLabel: string;
};

const TONE_INVITE: Record<MessageTone, (eventName: string) => string> = {
  warm: (name) => `מזמינים אותך ל${name}!`,
  neutral: (name) => `הנך/י מוזמן/ת ל${name}.`,
  professional: (name) => `נשמח לראותך ב${name}.`,
};

export function inviteLineForTemplate(tone: MessageTone, eventName: string): string {
  return TONE_INVITE[tone](eventName);
}

function tpl(
  audience: OrganizerAudienceId,
  eventType: EventTypeId,
  partial: Omit<EventTemplateDefaults, "audience" | "eventType">,
): EventTemplateDefaults {
  return { audience, eventType, ...partial };
}

/** מפתח ייחודי לכל שילוב קהל + אירוע (עם נפילה ל-other באותו קהל) */
const TEMPLATES: EventTemplateDefaults[] = [
  tpl("couples_families", "wedding", {
    sampleLandingTitle: "החתונה שלנו",
    tone: "warm",
    defaultChannels: { whatsapp: true, email: true, phone: false },
    channelOrder: ["whatsapp", "email", "phone"],
    channelOrderLabel: "WhatsApp → מייל → שיחה",
    partnerFieldLabel: "בן/בת זוג (לשיתוף)",
  }),
  tpl("couples_families", "engagement", {
    sampleLandingTitle: "אירוסינו",
    tone: "warm",
    defaultChannels: { whatsapp: true, email: true, phone: false },
    channelOrder: ["whatsapp", "email", "phone"],
    channelOrderLabel: "WhatsApp → מייל → שיחה",
    partnerFieldLabel: "בן/בת זוג",
  }),
  tpl("couples_families", "brit", {
    sampleLandingTitle: "שמחת הברית/הבריתה",
    tone: "warm",
    defaultChannels: { whatsapp: true, email: false, phone: false },
    channelOrder: ["whatsapp", "email", "phone"],
    channelOrderLabel: "WhatsApp → מייל",
    partnerFieldLabel: "הורה נוסף/ת (אופציונלי)",
  }),
  tpl("parents_celebration", "bar_bat_mitzvah", {
    sampleLandingTitle: "בר/בת המצווה שלנו",
    tone: "neutral",
    defaultChannels: { whatsapp: true, email: true, phone: false },
    channelOrder: ["whatsapp", "email", "phone"],
    channelOrderLabel: "WhatsApp → מייל → שיחה",
    partnerFieldLabel: "הורה שני/ה (לשיתוף)",
  }),
  tpl("community", "community", {
    sampleLandingTitle: "האירוע הקהילתי שלנו",
    tone: "neutral",
    defaultChannels: { whatsapp: true, email: true, phone: false },
    channelOrder: ["email", "whatsapp", "phone"],
    channelOrderLabel: "מייל → WhatsApp → שיחה",
    partnerFieldLabel: "איש קשר נוסף (אופציונלי)",
  }),
  tpl("business", "corporate", {
    sampleLandingTitle: "אירוע הצוות / החברה",
    tone: "professional",
    defaultChannels: { whatsapp: false, email: true, phone: false },
    channelOrder: ["email", "whatsapp", "phone"],
    channelOrderLabel: "מייל → WhatsApp → שיחה",
    partnerFieldLabel: "איש קשר נוסף בארגון",
  }),
  tpl("business", "conference", {
    sampleLandingTitle: "הכנס / ההשקה",
    tone: "professional",
    defaultChannels: { whatsapp: false, email: true, phone: true },
    channelOrder: ["email", "whatsapp", "phone"],
    channelOrderLabel: "מייל → WhatsApp → שיחה (VIP)",
    partnerFieldLabel: "מנהל/ת פרויקט",
  }),
  tpl("couples_families", "other", {
    sampleLandingTitle: "האירוע שלנו",
    tone: "warm",
    defaultChannels: { whatsapp: true, email: true, phone: false },
    channelOrder: ["whatsapp", "email", "phone"],
    channelOrderLabel: "WhatsApp → מייל → שיחה",
    partnerFieldLabel: "שותף/ה לאירוע",
  }),
  tpl("parents_celebration", "other", {
    sampleLandingTitle: "האירוע המשפחתי",
    tone: "neutral",
    defaultChannels: { whatsapp: true, email: true, phone: false },
    channelOrder: ["whatsapp", "email", "phone"],
    channelOrderLabel: "WhatsApp → מייל → שיחה",
    partnerFieldLabel: "הורה נוסף/ת",
  }),
  tpl("community", "other", {
    sampleLandingTitle: "האירוע",
    tone: "neutral",
    defaultChannels: { whatsapp: true, email: true, phone: false },
    channelOrder: ["email", "whatsapp", "phone"],
    channelOrderLabel: "מייל → WhatsApp → שיחה",
    partnerFieldLabel: "איש קשר",
  }),
  tpl("business", "other", {
    sampleLandingTitle: "אירוע עסקי",
    tone: "professional",
    defaultChannels: { whatsapp: false, email: true, phone: false },
    channelOrder: ["email", "whatsapp", "phone"],
    channelOrderLabel: "מייל → WhatsApp → שיחה",
    partnerFieldLabel: "איש קשר בארגון",
  }),
];

const templateIndex = new Map<string, EventTemplateDefaults>(
  TEMPLATES.map((t) => [`${t.audience}:${t.eventType}`, t]),
);

export function resolveEventTemplate(
  audience: OrganizerAudienceId,
  eventType: EventTypeId,
): EventTemplateDefaults {
  return (
    templateIndex.get(`${audience}:${eventType}`) ??
    templateIndex.get(`${audience}:other`) ??
    TEMPLATES[0]
  );
}

export function eventTypesForAudience(audience: OrganizerAudienceId) {
  return EVENT_TYPES.filter((t) => t.audiences.includes(audience));
}

export function defaultEventTypeForAudience(audience: OrganizerAudienceId): EventTypeId {
  const types = eventTypesForAudience(audience);
  return types[0]?.id ?? "other";
}

export const EVENT_TYPE_IDS = EVENT_TYPES.map((t) => t.id);
