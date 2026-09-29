import type { FoundingQuote } from "@/lib/domain/pricing";
import type { OnboardingFormValues } from "@/lib/domain/onboarding";
import { BRAND } from "@/lib/brand";

export type OperatorNotifyPayload = {
  lead: OnboardingFormValues & { id: string; referral_code: string };
  quote: FoundingQuote;
  workspaceUrl: string;
  publicSiteUrl: string;
};

function getOperatorEnv() {
  return {
    to: process.env.OPERATOR_NOTIFY_EMAIL?.trim() || "",
    bitLink: process.env.OPERATOR_BIT_LINK?.trim() || "",
    bitPhone: process.env.OPERATOR_BIT_PHONE?.trim() || "",
    resendKey: process.env.RESEND_API_KEY?.trim() || "",
    from: process.env.RESEND_FROM?.trim() || BRAND.mailFrom,
  };
}

export function buildOperatorEmailText(p: OperatorNotifyPayload): string {
  const env = getOperatorEnv();
  const ch = p.lead.channels;
  const channels = [
    ch.whatsapp ? "WhatsApp" : null,
    ch.email ? "מייל" : null,
    ch.phone ? "טלפון" : null,
  ]
    .filter(Boolean)
    .join(", ");

  return [
    `ליד חדש ב-${BRAND.name} — הרשמה מהאתר`,
    "",
    `שם: ${p.lead.organizer_name}`,
    p.lead.partner_name ? `בן/בת זוג: ${p.lead.partner_name}` : "",
    `טלפון: ${p.lead.phone}`,
    `מייל: ${p.lead.email}`,
    `סוג אירוע: ${p.lead.event_type}`,
    p.lead.event_date ? `תאריך: ${p.lead.event_date}` : "",
    `אורחים משוערים: ${p.lead.estimated_guests}`,
    `ערוצים: ${channels || "—"}`,
    p.lead.notes ? `הערות: ${p.lead.notes}` : "",
    p.lead.referred_by_code ? `קוד חבר שהוזן: ${p.lead.referred_by_code}` : "",
    "",
    "— מחירון יוזמים ראשונים (לפי מענה, לא שליחה) —",
    `מענים משוערים לחיוב: ${p.quote.estimatedResponses}`,
    `התחייבות מינימום (גם אם המענה בפועל נמוך): ${p.quote.totalProjectIls} ₪`,
    p.quote.minimumCommitmentApplied ? "(הוחל מינימום + מרווח עלות)" : "",
    `מקדמה (ביט): ${p.quote.depositDueIls} ₪`,
    `לגבייה עכשיו (אחרי זיכוי הפניה אם יש): ${p.quote.dueNowIls} ₪`,
    `יתרה אחרי מקדמה: ${p.quote.balanceAfterDepositIls} ₪`,
    "",
    "— שלח ללקוח בביט —",
    env.bitLink ? `קישור: ${env.bitLink}` : "",
    env.bitPhone ? `טלפון ביט: ${env.bitPhone}` : "",
    "",
    `סביבת עבודה (דמו, עד ${p.quote.trialInviteCap} הזמנות): ${p.workspaceUrl}`,
    `קוד הפניה של הלקוח (מביא חבר): ${p.lead.referral_code}`,
    "",
    "אחרי שהתקבל תשלום — סמן מקדמה במערכת (Hub) והפעל זיכוי 50 ₪ למפנה אם רלוונטי.",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

export async function notifyOperatorByEmail(
  p: OperatorNotifyPayload,
): Promise<{ ok: boolean; skipped?: string; error?: string }> {
  const env = getOperatorEnv();
  const text = buildOperatorEmailText(p);

  if (!env.to) {
    console.warn("[onboarding] OPERATOR_NOTIFY_EMAIL missing — operator email not sent");
    console.info(text);
    return { ok: false, skipped: "no_operator_email" };
  }

  if (!env.resendKey) {
    console.warn("[onboarding] RESEND_API_KEY missing — logging operator notice");
    console.info(text);
    return { ok: false, skipped: "no_resend_key" };
  }

  const subject = `${BRAND.name} — ליד חדש — ${p.quote.dueNowIls} ₪ לביט — ${p.lead.organizer_name}`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.from,
      to: [env.to],
      subject,
      text,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    return { ok: false, error: `resend_${res.status}: ${body}` };
  }
  return { ok: true };
}
