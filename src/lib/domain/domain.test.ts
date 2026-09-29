import { describe, expect, it } from "vitest";
import {
  computeRsvpMetrics,
  computeResponseRate,
  filterInvitees,
  extractRecordFromRow,
  parseInviteLine,
  parseInviteTextBlock,
  buildRsvpPayload,
  buildExistingLookupOr,
  normalizePhone,
  phoneToWaMe,
  generateGuestToken,
  isValidGuestTokenFormat,
  guestPath,
  guestRsvpUrl,
  WhatsAppRsvpBot,
  rsvpFormSchema,
  verifyMetaWebhookSignature,
} from "./index";

describe("phone", () => {
  it("normalizes Israeli mobile", () => {
    expect(normalizePhone("050-1234567")).toBe("972501234567");
    expect(phoneToWaMe("0501234567")).toBe("972501234567");
    expect(normalizePhone("501234567")).toBe("972501234567");
    expect(normalizePhone("00972 50-123-4567")).toBe("972501234567");
    expect(normalizePhone("12345")).toBeNull();
  });
});

describe("guest token", () => {
  it("rejects numeric ids", () => {
    expect(isValidGuestTokenFormat("123")).toBe(false);
    expect(isValidGuestTokenFormat(generateGuestToken())).toBe(true);
  });

  it("builds personal link path and absolute url", () => {
    const t = "AbCdEfGhIjKlMnOpQrStUv";
    expect(guestPath(t)).toBe(`/g/${t}`);
    expect(guestRsvpUrl("https://example.com/", t)).toBe(`https://example.com/g/${t}`);
  });
});

describe("metrics", () => {
  it("counts attending guests", () => {
    const m = computeRsvpMetrics([
      { id: "1", full_name: "a", phone: null, status: "attending", guests: 3, sleep: false, blessing: null, message_sent: false, created_at: "" },
      { id: "2", full_name: "b", phone: null, status: null, guests: 1, sleep: false, blessing: null, message_sent: false, created_at: "" },
    ]);
    expect(m.yes).toBe(1);
    expect(m.guestsTotal).toBe(3);
    expect(m.pending).toBe(1);
    expect(computeResponseRate(m)).toBe(0.5);
  });

  it("response rate is zero on empty list", () => {
    expect(computeResponseRate(computeRsvpMetrics([]))).toBe(0);
  });

  it("filters by name", () => {
    const list = [
      { id: "1", full_name: "דנה", phone: "050", status: null, guests: 1, sleep: false, blessing: null, message_sent: false, created_at: "" },
    ];
    expect(filterInvitees(list, "דנה")).toHaveLength(1);
    expect(filterInvitees(list, "xyz")).toHaveLength(0);
    const stored = [
      { id: "9", full_name: "א", phone: "972501234567", status: null, guests: 1, sleep: false, blessing: null, message_sent: false, created_at: "" },
    ];
    expect(filterInvitees(stored, "050-1234567")).toHaveLength(1);
  });
});

describe("import", () => {
  it("parses hebrew columns", () => {
    const r = extractRecordFromRow({ "שם מלא": "יוסי", טלפון: "0501111111" });
    expect(r.full_name).toBe("יוסי");
    expect(r.phone).toBe("972501111111");
  });

  it("parses smart line", () => {
    const r = parseInviteLine("דנה כהן 0501234567");
    expect(r.full_name).toContain("דנה");
    expect(r.phone).toBeTruthy();
  });

  it("dedupes the same mobile written two ways", () => {
    const rows = parseInviteTextBlock("דנה 050-1234567\nדנה כהן 972501234567\nיוסי 0521111111");
    expect(rows).toHaveLength(2);
    expect(rows[0].phone).toBe("972501234567");
    expect(rows[1].phone).toBe("972521111111");
  });
});

describe("rsvp payload", () => {
  it("builds attending payload", () => {
    const p = buildRsvpPayload({
      full_name: "Test",
      status: "attending",
      guests: 2,
      sleep: true,
    });
    expect(p.guests).toBe(2);
    expect(p.status).toBe("attending");
    expect(p.phone).toBeNull();
  });

  it("drops invalid phones and clamps guest count", () => {
    const p = buildRsvpPayload({
      full_name: "Test",
      phone: "12345",
      status: "attending",
      guests: 40,
      sleep: false,
    });
    expect(p.phone).toBeNull();
    expect(p.guests).toBe(5);
  });

  it("quotes lookup values so a comma in a name stays one filter", () => {
    const parts = buildExistingLookupOr({
      full_name: "כהן, דנה",
      phone: "0501234567",
      status: "attending",
      guests: 1,
      sleep: false,
    });
    expect(parts.some((p) => p.includes('"כהן, דנה"'))).toBe(true);
    expect(parts.some((p) => p.includes("972501234567"))).toBe(true);
  });

  it("lookup or includes phone variants", () => {
    const parts = buildExistingLookupOr({ phone: "0501234567", status: "attending", guests: 1, sleep: false });
    expect(parts.some((p) => p.includes("phone"))).toBe(true);
  });
});

describe("whatsapp bot", () => {
  it("yes then guest count", () => {
    const bot = new WhatsAppRsvpBot();
    const t = "tok_test_abc";
    bot.handleInbound(t, "1");
    const { session } = bot.handleInbound(t, "3");
    expect(session.state).toBe("complete");
    expect(session.guestCount).toBe(3);
    expect(bot.toInvitee(session)).toEqual({ status: "attending", guests: 3 });
  });

  it("maps a decline onto the host status not_attending", () => {
    const bot = new WhatsAppRsvpBot();
    const { session } = bot.handleInbound("tok_no", "2");
    expect(bot.toInvitee(session)).toEqual({ status: "not_attending", guests: 1 });
    const metrics = computeRsvpMetrics([
      {
        id: "1",
        full_name: "דנה",
        phone: null,
        status: bot.toInvitee(session).status,
        guests: 1,
        sleep: false,
        blessing: null,
        message_sent: false,
        created_at: "",
      },
    ]);
    expect(metrics.no).toBe(1);
    expect(computeResponseRate(metrics)).toBe(1);
  });
});

describe("form schema", () => {
  it("rejects a phone that cannot be normalized", () => {
    const parsed = rsvpFormSchema.safeParse({
      full_name: "",
      phone: "12345",
      status: "attending",
      guests: 1,
      sleep: false,
    });
    expect(parsed.success).toBe(false);
  });
});

describe("webhook verify", () => {
  it("validates hmac", async () => {
    const body = new TextEncoder().encode('{"entry":[]}');
    const secret = "test_secret";
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const sig = await crypto.subtle.sign("HMAC", key, body);
    const hex = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    expect(await verifyMetaWebhookSignature(body, `sha256=${hex}`, secret)).toBe(true);
  });
});
