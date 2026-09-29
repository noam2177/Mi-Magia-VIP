import { describe, expect, it } from "vitest";

import { canSendTrialInvite, atLeastOneChannel, onboardingFormSchema } from "./onboarding";

describe("trial invites", () => {
  it("blocks without event type", () => {
    const r = canSendTrialInvite({
      eventTypeSet: false,
      trialInvitesSent: 0,
      paymentStatus: "unpaid",
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("event_type_required");
  });

  it("allows up to cap before deposit", () => {
    const r = canSendTrialInvite({
      eventTypeSet: true,
      trialInvitesSent: 4,
      paymentStatus: "unpaid",
    });
    expect(r.ok).toBe(true);
    expect(r.remaining).toBe(1);
  });

  it("blocks at cap", () => {
    const r = canSendTrialInvite({
      eventTypeSet: true,
      trialInvitesSent: 5,
      paymentStatus: "unpaid",
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("trial_cap");
  });
});

describe("onboardingFormSchema", () => {
  it("requires at least one channel in app layer", () => {
    expect(
      atLeastOneChannel({ whatsapp: false, email: false, phone: false }),
    ).toBe(false);
    expect(
      atLeastOneChannel({ whatsapp: true, email: false, phone: false }),
    ).toBe(true);
  });

  it("parses valid payload", () => {
    const v = onboardingFormSchema.parse({
      organizer_name: "דנה כהן",
      phone: "0501234567",
      email: "a@b.com",
      event_category: "personal",
      event_type: "wedding",
      estimated_guests: 120,
      channels: { whatsapp: true, email: true, phone: false },
    });
    expect(v.estimated_guests).toBe(120);
  });
});
