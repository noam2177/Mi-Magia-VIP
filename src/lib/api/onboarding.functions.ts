import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  onboardingFormSchema,
  generateOrganizerAccessToken,
  generateReferralCode,
  slugFromOrganizerName,
  atLeastOneChannel,
  canSendTrialInvite,
} from "@/lib/domain/onboarding";
import { computeFoundingQuote } from "@/lib/domain/pricing";
import { sumReferralCredits, referralCreditForFriendDeposit } from "@/lib/domain/referral";
import { notifyOperatorByEmail } from "@/lib/operator-notify.server";
import { buildTrialInviteActionUrl, type TrialInviteChannel } from "@/lib/domain/trial-invite";
import { newInviteeWithToken } from "@/lib/domain/rsvp-payload";
import { normalizePhone } from "@/lib/domain/phone";

function publicSiteOrigin(): string {
  return (
    process.env.PUBLIC_SITE_URL?.trim() ||
    process.env.VITE_PUBLIC_SITE_URL?.trim() ||
    "http://localhost:8080"
  );
}

export const submitOnboardingLead = createServerFn({ method: "POST" })
  .inputValidator(onboardingFormSchema)
  .handler(async ({ data }) => {
    if (!atLeastOneChannel(data.channels)) {
      throw new Error("בחרו לפחות ערוץ הזמנה אחד");
    }

    const quote = computeFoundingQuote({
      estimatedGuests: data.estimated_guests,
      channels: data.channels,
      referralCreditIls: 0,
    });

    if (!quote.quoteValid) {
      throw new Error(quote.quoteError ?? "invalid_quote");
    }

    const referral_code = generateReferralCode();
    const organizer_access_token = generateOrganizerAccessToken();
    const slug = slugFromOrganizerName(data.organizer_name);

    const { data: lead, error: leadErr } = await supabaseAdmin
      .from("onboarding_leads")
      .insert({
        organizer_name: data.organizer_name,
        partner_name: data.partner_name || null,
        phone: data.phone,
        email: data.email,
        event_type: data.event_type,
        event_date: data.event_date || null,
        estimated_guests: data.estimated_guests,
        channels: data.channels,
        notes: data.notes || null,
        status: "operator_notified",
        referral_code,
        referred_by_code: data.referred_by_code?.trim().toUpperCase() || null,
        quoted_deposit_ils: quote.depositDueIls,
        quoted_total_ils: quote.totalProjectIls,
        quoted_due_now_ils: quote.dueNowIls,
        quoted_minimum_commitment_ils: quote.totalProjectIls,
        quoted_estimated_responses: quote.estimatedResponses,
        billing_model: quote.billingModel,
        operator_notified_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (leadErr || !lead) {
      throw new Error(leadErr?.message ?? "lead_insert_failed");
    }

    const { error: eventErr } = await supabaseAdmin.from("events").insert({
      lead_id: lead.id,
      slug,
      event_type: data.event_type,
      organizer_access_token,
      channels: data.channels,
      payment_status: "unpaid",
      trial_invites_cap: quote.trialInviteCap,
    });

    if (eventErr) {
      throw new Error(eventErr.message);
    }

    const origin = publicSiteOrigin();
    const workspaceUrl = `${origin}/w/${organizer_access_token}`;

    await notifyOperatorByEmail({
      lead: { ...data, id: lead.id, referral_code },
      quote,
      workspaceUrl,
      publicSiteUrl: origin,
    });

    return {
      ok: true,
      workspaceUrl,
      referralCode: referral_code,
      quote: {
        dueNowIls: quote.dueNowIls,
        depositDueIls: quote.depositDueIls,
        totalProjectIls: quote.totalProjectIls,
        trialInviteCap: quote.trialInviteCap,
      },
    };
  });

const workspaceTokenSchema = z.object({
  accessToken: z.string().min(16),
});

export const getOrganizerWorkspaceByToken = createServerFn({ method: "POST" })
  .inputValidator(workspaceTokenSchema)
  .handler(async ({ data }) => {
    const { data: event, error } = await supabaseAdmin
      .from("events")
      .select(
        "id, slug, event_type, trial_invites_sent, trial_invites_cap, payment_status, channels, lead_id",
      )
      .eq("organizer_access_token", data.accessToken)
      .maybeSingle();

    if (error || !event) {
      throw new Error("workspace_not_found");
    }

    const { data: lead } = await supabaseAdmin
      .from("onboarding_leads")
      .select(
        "id, organizer_name, partner_name, email, phone, estimated_guests, referral_code, quoted_due_now_ils, quoted_total_ils, channels",
      )
      .eq("id", event.lead_id)
      .maybeSingle();

    const { data: creditRows } = lead?.id
      ? await supabaseAdmin
          .from("referral_credits")
          .select("amount_ils")
          .eq("beneficiary_lead_id", lead.id)
      : { data: [] };

    const channels = (event.channels ?? {}) as {
      whatsapp?: boolean;
      email?: boolean;
      phone?: boolean;
    };

    const quote = computeFoundingQuote({
      estimatedGuests: lead?.estimated_guests ?? 0,
      channels: {
        whatsapp: Boolean(channels.whatsapp),
        email: Boolean(channels.email),
        phone: Boolean(channels.phone),
      },
      referralCreditIls: sumReferralCredits(creditRows ?? []),
    });

    const trial = canSendTrialInvite({
      eventTypeSet: Boolean(event.event_type),
      trialInvitesSent: event.trial_invites_sent ?? 0,
      paymentStatus: (event.payment_status as "unpaid" | "deposit_paid" | "paid_full") ?? "unpaid",
      cap: event.trial_invites_cap ?? 5,
    });

    return {
      event: {
        slug: event.slug,
        eventType: event.event_type,
        paymentStatus: event.payment_status,
        trialInvitesSent: event.trial_invites_sent,
        trialInvitesCap: event.trial_invites_cap,
      },
      lead,
      quote,
      trial,
      shareUrl: `${publicSiteOrigin()}/w/${data.accessToken}`,
    };
  });

export const recordTrialInviteSend = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      accessToken: z.string().min(16),
      channel: z.enum(["whatsapp", "email", "phone"]),
      guestName: z.string().min(1).max(120),
      guestPhone: z.string().max(40).optional(),
      guestEmail: z.string().email().optional().or(z.literal("")),
    }),
  )
  .handler(async ({ data }) => {
    const { data: event, error } = await supabaseAdmin
      .from("events")
      .select("id, slug, event_type, trial_invites_sent, trial_invites_cap, payment_status")
      .eq("organizer_access_token", data.accessToken)
      .maybeSingle();

    if (error || !event) throw new Error("workspace_not_found");

    const trial = canSendTrialInvite({
      eventTypeSet: Boolean(event.event_type),
      trialInvitesSent: event.trial_invites_sent ?? 0,
      paymentStatus: (event.payment_status as "unpaid" | "deposit_paid" | "paid_full") ?? "unpaid",
      cap: event.trial_invites_cap ?? 5,
    });

    if (!trial.ok) {
      throw new Error(trial.reason ?? "trial_blocked");
    }

    const origin = publicSiteOrigin();
    const rsvpUrl = `${origin}/e/${event.slug}`;
    const actionUrl = buildTrialInviteActionUrl({
      channel: data.channel as TrialInviteChannel,
      guestName: data.guestName,
      rsvpUrl,
      guestPhone: data.guestPhone,
      guestEmail: data.guestEmail || undefined,
    });

    if (!actionUrl) {
      throw new Error("missing_contact_for_channel");
    }

    await supabaseAdmin.from("invitees").insert(
      newInviteeWithToken({
        full_name: data.guestName,
        phone: data.guestPhone ? normalizePhone(data.guestPhone) : null,
        event_id: event.id,
        message_sent: true,
      }),
    );

    const next = (event.trial_invites_sent ?? 0) + 1;
    await supabaseAdmin.from("events").update({ trial_invites_sent: next }).eq("id", event.id);

    return {
      ok: true,
      actionUrl,
      trialInvitesSent: next,
      trialInvitesCap: event.trial_invites_cap ?? 5,
    };
  });

/** Hub / operator only — after Bit deposit received from referred lead */
export const markDepositPaidWithReferral = createServerFn({ method: "POST" })
  .inputValidator(z.object({ friendLeadId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { data: friend } = await supabaseAdmin
      .from("onboarding_leads")
      .select("id, referred_by_code")
      .eq("id", data.friendLeadId)
      .maybeSingle();

    if (!friend) throw new Error("lead_not_found");

    await supabaseAdmin
      .from("events")
      .update({ payment_status: "deposit_paid" })
      .eq("lead_id", friend.id);

    await supabaseAdmin
      .from("onboarding_leads")
      .update({ status: "deposit_paid" })
      .eq("id", friend.id);

    if (friend.referred_by_code) {
      const { data: referrer } = await supabaseAdmin
        .from("onboarding_leads")
        .select("id")
        .eq("referral_code", friend.referred_by_code)
        .maybeSingle();

      if (referrer?.id) {
        await supabaseAdmin.from("referral_credits").upsert(
          {
            beneficiary_lead_id: referrer.id,
            friend_lead_id: friend.id,
            amount_ils: referralCreditForFriendDeposit(),
            reason: "friend_deposit_paid",
          },
          { onConflict: "beneficiary_lead_id,friend_lead_id" },
        );
      }
    }

    return { ok: true };
  });
