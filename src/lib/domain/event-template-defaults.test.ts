import { describe, expect, it } from "vitest";

import {
  defaultEventTypeForCategory,
  eventTypesForCategory,
  inviteLineForTemplate,
  resolveEventTemplate,
} from "./event-template-defaults";

describe("event template defaults", () => {
  it("business corporate uses professional tone and email-first channels", () => {
    const t = resolveEventTemplate("business", "corporate");
    expect(t.tone).toBe("professional");
    expect(t.defaultChannels.email).toBe(true);
    expect(t.defaultChannels.whatsapp).toBe(false);
    expect(t.channelOrder[0]).toBe("email");
  });

  it("wedding stays warm with featured badge", () => {
    const t = resolveEventTemplate("personal", "wedding");
    expect(t.tone).toBe("warm");
    expect(t.visual.badge).toBeTruthy();
    expect(inviteLineForTemplate(t.tone, "החתונה")).toContain("מזמינים");
  });

  it("bar and bat mitzvah differ visually", () => {
    const bar = resolveEventTemplate("personal", "bar_mitzvah");
    const bat = resolveEventTemplate("personal", "bat_mitzvah");
    expect(bar.visual.gradient).not.toBe(bat.visual.gradient);
    expect(bar.sampleLandingTitle).toContain("בר");
    expect(bat.sampleLandingTitle).toContain("בת");
  });

  it("unknown type falls back to generic personal template", () => {
    const t = resolveEventTemplate("personal", "other");
    expect(t.sampleSubtitle).toContain("בסיסי");
  });

  it("display name overrides sample title", () => {
    const t = resolveEventTemplate("personal", "wedding", "חתונת נועם ודנה");
    expect(t.sampleLandingTitle).toBe("חתונת נועם ודנה");
  });

  it("filters event types per category", () => {
    const biz = eventTypesForCategory("business").map((x) => x.id);
    expect(biz).toContain("corporate");
    expect(biz).not.toContain("wedding");
  });

  it("defaults wedding for personal", () => {
    expect(defaultEventTypeForCategory("personal")).toBe("wedding");
    expect(defaultEventTypeForCategory("business")).toBe("corporate");
  });
});
