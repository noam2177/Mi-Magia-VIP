import { describe, expect, it } from "vitest";

import { buildTrialInviteActionUrl, buildTrialInviteMessage } from "./trial-invite";

describe("trial invite outreach", () => {
  it("builds Hebrew message with link", () => {
    const m = buildTrialInviteMessage("דנה", "https://x.com/e/foo");
    expect(m).toContain("דנה");
    expect(m).toContain("https://x.com/e/foo");
  });

  it("builds wa.me link", () => {
    const url = buildTrialInviteActionUrl({
      channel: "whatsapp",
      guestName: "דנה",
      rsvpUrl: "https://x.com/e/foo",
      guestPhone: "0501234567",
    });
    expect(url).toMatch(/^https:\/\/wa\.me\/972501234567\?text=/);
  });

  it("requires email for mailto", () => {
    expect(
      buildTrialInviteActionUrl({
        channel: "email",
        guestName: "a",
        rsvpUrl: "https://x.com",
        guestEmail: "a@b.com",
      }),
    ).toMatch(/^mailto:a@b.com/);
  });
});
