import { z } from "zod";

import type { InviteChannels } from "./pricing";
import { FOUNDING_RATE_CARD } from "./pricing";
import { generateGuestToken } from "./guest-token";

export const EVENT_TYPES = [
  { id: "wedding", label: "חתונה" },
  { id: "bar_bat_mitzvah", label: "בר/בת מצווה" },
  { id: "brit", label: "ברית / בריתה" },
  { id: "engagement", label: "אירוסין" },
  { id: "community", label: "אירוע קהילתי" },
  { id: "other", label: "אחר" },
] as const;

export type EventTypeId = (typeof EVENT_TYPES)[number]["id"];

export const LeadStatus = {
  SUBMITTED: "submitted",
  OPERATOR_NOTIFIED: "operator_notified",
  TRIAL_ACTIVE: "trial_active",
  DEPOSIT_PAID: "deposit_paid",
  ACTIVE: "active",
  REJECTED: "rejected",
} as const;

export type LeadStatusValue = (typeof LeadStatus)[keyof typeof LeadStatus];

export const onboardingFormSchema = z.object({
  organizer_name: z.string().min(2, "שם מלא קצר מדי"),
  partner_name: z.string().optional(),
  phone: z.string().min(9, "טלפון נדרש"),
  email: z.string().email("מייל לא תקין"),
  event_type: z.enum([
    "wedding",
    "bar_bat_mitzvah",
    "brit",
    "engagement",
    "community",
    "other",
  ]),
  event_date: z.string().optional(),
  estimated_guests: z.coerce.number().int().min(1).max(2000),
  channels: z.object({
    whatsapp: z.boolean(),
    email: z.boolean(),
    phone: z.boolean(),
  }),
  notes: z.string().max(2000).optional(),
  referred_by_code: z.string().max(32).optional(),
});

export type OnboardingFormValues = z.infer<typeof onboardingFormSchema>;

export function generateOrganizerAccessToken(): string {
  return generateGuestToken();
}

export function generateReferralCode(): string {
  const raw = generateGuestToken().replace(/[^A-Za-z0-9]/g, "").slice(0, 8);
  return raw.toUpperCase();
}

export function slugFromOrganizerName(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\u0590-\u05FF-]/g, "")
    .slice(0, 24);
  const suffix = generateGuestToken().slice(0, 6).toLowerCase();
  return `${base || "event"}-${suffix}`;
}

export type TrialSendCheck = {
  ok: boolean;
  reason?: "trial_cap" | "event_type_required" | "not_paid";
  remaining?: number;
};

export function canSendTrialInvite(args: {
  eventTypeSet: boolean;
  trialInvitesSent: number;
  paymentStatus: "unpaid" | "deposit_paid" | "paid_full";
  cap?: number;
}): TrialSendCheck {
  const cap = args.cap ?? FOUNDING_RATE_CARD.trialInviteCap;
  if (!args.eventTypeSet) {
    return { ok: false, reason: "event_type_required" };
  }
  if (args.paymentStatus !== "unpaid") {
    return { ok: true, remaining: cap };
  }
  if (args.trialInvitesSent >= cap) {
    return { ok: false, reason: "trial_cap", remaining: 0 };
  }
  return { ok: true, remaining: cap - args.trialInvitesSent };
}

export function channelsFromForm(c: InviteChannels): InviteChannels {
  return { whatsapp: c.whatsapp, email: c.email, phone: c.phone };
}

export function atLeastOneChannel(channels: InviteChannels): boolean {
  return channels.whatsapp || channels.email || channels.phone;
}
