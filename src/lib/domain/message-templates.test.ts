import { describe, expect, it } from "vitest";
import { buildGuestMessage, buildWhatsAppUrl, formatEventDate } from "./message-templates";

const ctx = {
  eventName: "החתונה של דניאל ותומר",
  eventDate: "2026-11-05T18:00:00Z",
  locationName: "גן אירועים",
  mapsUrl: "https://waze.com/ul?q=x",
  rsvpUrl: "https://example.test/g/TOKEN123",
};

describe("message templates", () => {
  it("invite includes name, event, rsvp link and map", () => {
    const m = buildGuestMessage("invite", ctx, "דנה");
    expect(m).toContain("דנה");
    expect(m).toContain(ctx.eventName);
    expect(m).toContain(ctx.rsvpUrl);
    expect(m).toContain(ctx.mapsUrl);
  });

  it("omits missing optional lines instead of printing undefined", () => {
    const m = buildGuestMessage("invite", { eventName: "אירוע" }, "  ");
    expect(m).not.toMatch(/undefined|null/);
    expect(m).toContain("חבר/ה");
  });

  it("reminder asks for RSVP only when a link exists", () => {
    expect(buildGuestMessage("reminder", ctx, "א")).toContain(ctx.rsvpUrl);
    expect(buildGuestMessage("reminder", { eventName: "x" }, "א")).not.toContain("עוד לא אישרתם");
  });

  it("map falls back when no url", () => {
    expect(buildGuestMessage("map", { eventName: "x" }, "א")).toContain("בהמשך");
  });

  it("formatEventDate handles bad input", () => {
    expect(formatEventDate("nope")).toBeNull();
    expect(formatEventDate(null)).toBeNull();
    expect(formatEventDate(ctx.eventDate)).toBeTruthy();
  });

  it("whatsapp url is encoded and null without phone", () => {
    expect(buildWhatsAppUrl(null, "hi")).toBeNull();
    expect(buildWhatsAppUrl("972501234567", "a b")).toBe("https://wa.me/972501234567?text=a%20b");
  });
});
