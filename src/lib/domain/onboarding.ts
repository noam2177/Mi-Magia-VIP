import { z } from "zod";

import type { InviteChannels } from "./pricing";
import { FOUNDING_RATE_CARD } from "./pricing";
import { generateGuestToken } from "./guest-token";
import {
  EVENT_CATEGORIES,
  EVENT_TYPES,
  EVENT_TYPE_IDS,
  type EventCategoryId,
  type EventTypeId,
  ORGANIZER_AUDIENCES,
  type OrganizerAudienceId,
  legacyAudienceFromCategory,
} from "./event-template-defaults";

export {
  EVENT_TYPES,
  EVENT_CATEGORIES,
  EVENT_TYPE_IDS,
  type EventTypeId,
  type EventCategoryId,
  ORGANIZER_AUDIENCES,
  type OrganizerAudienceId,
};

const eventTypeSchema = z.enum([
  "wedding",
  "bachelor_party",
  "bachelorette_party",
  "engagement",
  "bar_mitzvah",
  "bat_mitzvah",
  "brit",
  "brita",
  "community",
  "corporate",
  "conference",
  "networking",
  "product_launch",
  "other",
]);

export const onboardingFormSchema = z.object({
  organizer_name: z.string().min(2, "שם מלא קצר מדי"),
  partner_name: z.string().optional(),
  phone: z.string().min(9, "טלפון נדרש"),
  email: z.string().email("מייל לא תקין"),
  event_category: z.enum(["personal", "business"]),
  event_type: eventTypeSchema,
  /** שם האירוע כפי שיופיע באורח — מעדכן תצוגת הטמפלט */
  event_display_name: z.string().max(120).optional(),
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

export function legacyAudienceForLead(values: OnboardingFormValues): OrganizerAudienceId {
  return legacyAudienceFromCategory(values.event_category, values.event_type);
}

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

export function atLeastOneChannel(channels: InviteChannels): boolean {
  return channels.whatsapp || channels.email || channels.phone;
}
