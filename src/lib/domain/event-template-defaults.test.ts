import { describe, expect, it } from "vitest";

import {
  defaultEventTypeForAudience,
  eventTypesForAudience,
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

  it("wedding stays warm with whatsapp first", () => {
    const t = resolveEventTemplate("couples_families", "wedding");
    expect(t.tone).toBe("warm");
    expect(t.defaultChannels.whatsapp).toBe(true);
    expect(inviteLineForTemplate(t.tone, "החתונה")).toContain("מזמינים");
  });

  it("filters event types per audience", () => {
    const biz = eventTypesForAudience("business").map((x) => x.id);
    expect(biz).toContain("corporate");
    expect(biz).toContain("conference");
    expect(biz).not.toContain("wedding");
  });

  it("picks sensible default event type per audience", () => {
    expect(defaultEventTypeForAudience("business")).toBe("corporate");
    expect(defaultEventTypeForAudience("parents_celebration")).toBe("bar_bat_mitzvah");
  });
});
