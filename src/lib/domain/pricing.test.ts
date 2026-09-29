import { describe, expect, it } from "vitest";

import {
  computeFoundingQuote,
  computeInternalCostFloor,
  FOUNDING_RATE_CARD,
  quoteMeetsCostFloor,
  clampEstimatedGuests,
} from "./pricing";

describe("clampEstimatedGuests", () => {
  it("clamps invalid input", () => {
    expect(clampEstimatedGuests(NaN)).toBe(1);
    expect(clampEstimatedGuests(0)).toBe(1);
    expect(clampEstimatedGuests(9999)).toBe(2000);
  });
});

describe("computeFoundingQuote", () => {
  it("requires at least one channel", () => {
    const q = computeFoundingQuote({
      estimatedGuests: 100,
      channels: { whatsapp: false, email: false, phone: false },
    });
    expect(q.quoteValid).toBe(false);
    expect(q.totalProjectIls).toBe(0);
  });

  it("prices by estimated responses not raw sends", () => {
    const q = computeFoundingQuote({
      estimatedGuests: 100,
      channels: { whatsapp: true, email: false, phone: false },
    });
    expect(q.quoteValid).toBe(true);
    expect(q.estimatedResponses).toBe(Math.ceil(100 * FOUNDING_RATE_CARD.expectedResponseRate));
    expect(q.billingModel).toBe("per_response");
    expect(quoteMeetsCostFloor(q)).toBe(true);
  });

  it("never quotes below minimum commitment / cost floor", () => {
    const q = computeFoundingQuote({
      estimatedGuests: 5,
      channels: { whatsapp: true, email: false, phone: false },
    });
    expect(q.totalProjectIls).toBeGreaterThanOrEqual(q.minimumCommitmentIls);
    expect(q.totalProjectIls).toBeGreaterThanOrEqual(q.internalCostFloorIls);
  });

  it("adds channel costs on response basis", () => {
    const waOnly = computeFoundingQuote({
      estimatedGuests: 250,
      channels: { whatsapp: true, email: false, phone: false },
    });
    const all = computeFoundingQuote({
      estimatedGuests: 250,
      channels: { whatsapp: true, email: true, phone: true },
    });
    expect(all.totalProjectIls).toBeGreaterThan(waOnly.totalProjectIls);
  });

  it("applies referral credit to dueNow", () => {
    const q = computeFoundingQuote({
      estimatedGuests: 80,
      channels: { whatsapp: true, email: true, phone: false },
      referralCreditIls: 50,
    });
    expect(q.referralCreditAppliedIls).toBe(50);
    expect(q.dueNowIls).toBe(q.depositDueIls - 50);
  });

  it("internal floor scales with responses", () => {
    const low = computeInternalCostFloor(10, { whatsapp: true, email: false, phone: false }, FOUNDING_RATE_CARD);
    const high = computeInternalCostFloor(200, { whatsapp: true, email: false, phone: false }, FOUNDING_RATE_CARD);
    expect(high).toBeGreaterThan(low);
  });
});
