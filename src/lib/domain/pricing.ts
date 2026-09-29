/** Founding-user pricing — per RSVP response (not per send), with cost floor + minimum commitment. */

export type InviteChannels = {
  whatsapp: boolean;
  email: boolean;
  phone: boolean;
};

export type FoundingRateCard = {
  depositIls: number;
  platformFeeIls: number;
  /** Charged per estimated **response** (מענה), not per invitation sent */
  perResponseWhatsappIls: number;
  perResponseEmailIls: number;
  perResponsePhoneIls: number;
  /** Internal unit cost per response — used for margin floor only */
  costPerResponseWhatsappIls: number;
  costPerResponseEmailIls: number;
  costPerResponsePhoneIls: number;
  expectedResponseRate: number;
  minimumCommitmentIls: number;
  safetyMarginMultiplier: number;
  foundingDiscountMultiplier: number;
  trialInviteCap: number;
  referralDepositCreditIls: number;
};

/** Default card — see docs/PRICING_FOUNDING_USERS.md */
export const FOUNDING_RATE_CARD: FoundingRateCard = {
  depositIls: 249,
  platformFeeIls: 99,
  perResponseWhatsappIls: 2.4,
  perResponseEmailIls: 1.2,
  perResponsePhoneIls: 7,
  costPerResponseWhatsappIls: 1.1,
  costPerResponseEmailIls: 0.35,
  costPerResponsePhoneIls: 4.2,
  expectedResponseRate: 0.65,
  minimumCommitmentIls: 399,
  safetyMarginMultiplier: 1.12,
  foundingDiscountMultiplier: 0.75,
  trialInviteCap: 5,
  referralDepositCreditIls: 50,
};

export type QuoteLineItem = {
  id: string;
  label: string;
  amountIls: number;
};

export type FoundingQuoteInput = {
  estimatedGuests: number;
  channels: InviteChannels;
  referralCreditIls?: number;
  rateCard?: FoundingRateCard;
};

export type FoundingQuote = {
  estimatedGuests: number;
  estimatedResponses: number;
  channels: InviteChannels;
  lineItems: QuoteLineItem[];
  usageBeforeDiscountIls: number;
  usageAfterDiscountIls: number;
  internalCostFloorIls: number;
  minimumCommitmentIls: number;
  minimumCommitmentApplied: boolean;
  depositDueIls: number;
  totalProjectIls: number;
  balanceAfterDepositIls: number;
  referralCreditAppliedIls: number;
  dueNowIls: number;
  trialInviteCap: number;
  foundingLabel: string;
  billingModel: "per_response";
  quoteValid: boolean;
  quoteError?: string;
};

export function clampEstimatedGuests(raw: number): number {
  if (!Number.isFinite(raw)) return 1;
  return Math.min(2000, Math.max(1, Math.floor(raw)));
}

export function hasActiveChannel(channels: InviteChannels): boolean {
  return channels.whatsapp || channels.email || channels.phone;
}

function roundIls(n: number): number {
  return Math.round(n * 100) / 100;
}

export function estimateResponses(guests: number, rateCard: FoundingRateCard): number {
  const g = clampEstimatedGuests(guests);
  return Math.max(1, Math.ceil(g * rateCard.expectedResponseRate));
}

function perResponsePrice(channels: InviteChannels, card: FoundingRateCard): number {
  return (
    (channels.whatsapp ? card.perResponseWhatsappIls : 0) +
    (channels.email ? card.perResponseEmailIls : 0) +
    (channels.phone ? card.perResponsePhoneIls : 0)
  );
}

function perResponseInternalCost(channels: InviteChannels, card: FoundingRateCard): number {
  return (
    (channels.whatsapp ? card.costPerResponseWhatsappIls : 0) +
    (channels.email ? card.costPerResponseEmailIls : 0) +
    (channels.phone ? card.costPerResponsePhoneIls : 0)
  );
}

export function computeInternalCostFloor(
  estimatedResponses: number,
  channels: InviteChannels,
  card: FoundingRateCard,
): number {
  const variable = estimatedResponses * perResponseInternalCost(channels, card);
  const platformCost = card.platformFeeIls * 0.45;
  return roundIls((platformCost + variable) * card.safetyMarginMultiplier);
}

export function computeFoundingQuote(input: FoundingQuoteInput): FoundingQuote {
  const card = input.rateCard ?? FOUNDING_RATE_CARD;
  const guests = clampEstimatedGuests(input.estimatedGuests);
  const credit = Math.max(0, input.referralCreditIls ?? 0);

  if (!hasActiveChannel(input.channels)) {
    return {
      estimatedGuests: guests,
      estimatedResponses: 0,
      channels: input.channels,
      lineItems: [],
      usageBeforeDiscountIls: 0,
      usageAfterDiscountIls: 0,
      internalCostFloorIls: 0,
      minimumCommitmentIls: card.minimumCommitmentIls,
      minimumCommitmentApplied: false,
      depositDueIls: 0,
      totalProjectIls: 0,
      balanceAfterDepositIls: 0,
      referralCreditAppliedIls: 0,
      dueNowIls: 0,
      trialInviteCap: card.trialInviteCap,
      foundingLabel: "מסלול יוזמים ראשונים",
      billingModel: "per_response",
      quoteValid: false,
      quoteError: "בחרו לפחות ערוץ הזמנה אחד",
    };
  }

  const estimatedResponses = estimateResponses(guests, card);
  const perResponse = perResponsePrice(input.channels, card);
  const responseSubtotal = estimatedResponses * perResponse;
  const usageBeforeDiscountIls = roundIls(card.platformFeeIls + responseSubtotal);
  const usageAfterDiscountIls = roundIls(usageBeforeDiscountIls * card.foundingDiscountMultiplier);

  const internalCostFloorIls = computeInternalCostFloor(estimatedResponses, input.channels, card);
  const floorIls = roundIls(Math.max(card.minimumCommitmentIls, internalCostFloorIls));
  const totalProjectIls = roundIls(Math.max(usageAfterDiscountIls, floorIls));
  const minimumCommitmentApplied = totalProjectIls > usageAfterDiscountIls;

  const lineItems: QuoteLineItem[] = [
    { id: "platform", label: "דמי פתיחת אירוע", amountIls: roundIls(card.platformFeeIls * card.foundingDiscountMultiplier) },
    {
      id: "model",
      label: "תמחור לפי מענה משוער (לא לפי שליחה)",
      amountIls: 0,
    },
    {
      id: "responses",
      label: `מענים משוערים (${Math.round(card.expectedResponseRate * 100)}% מ־${guests} מוזמנים)`,
      amountIls: 0,
    },
  ];

  if (input.channels.whatsapp) {
    lineItems.push({
      id: "wa",
      label: `WhatsApp — ${estimatedResponses} מענים × ${card.perResponseWhatsappIls} ₪`,
      amountIls: roundIls(estimatedResponses * card.perResponseWhatsappIls * card.foundingDiscountMultiplier),
    });
  }
  if (input.channels.email) {
    lineItems.push({
      id: "email",
      label: `מייל — ${estimatedResponses} מענים × ${card.perResponseEmailIls} ₪`,
      amountIls: roundIls(estimatedResponses * card.perResponseEmailIls * card.foundingDiscountMultiplier),
    });
  }
  if (input.channels.phone) {
    lineItems.push({
      id: "phone",
      label: `טלפון — ${estimatedResponses} מענים × ${card.perResponsePhoneIls} ₪`,
      amountIls: roundIls(estimatedResponses * card.perResponsePhoneIls * card.foundingDiscountMultiplier),
    });
  }

  if (usageBeforeDiscountIls > usageAfterDiscountIls) {
    lineItems.push({
      id: "founding",
      label: "הנחת יוזמים ראשונים (25%)",
      amountIls: roundIls(usageAfterDiscountIls - usageBeforeDiscountIls),
    });
  }

  if (minimumCommitmentApplied) {
    lineItems.push({
      id: "floor",
      label: `מינימום התחייבות (כולל מרווח עלות) — ${floorIls} ₪`,
      amountIls: roundIls(totalProjectIls - usageAfterDiscountIls),
    });
  }

  lineItems.push({
    id: "trial",
    label: `דמו — עד ${card.trialInviteCap} הזמנות לפני מקדמה (לא מחויב במענה)`,
    amountIls: 0,
  });

  const depositDueIls = roundIls(Math.min(card.depositIls, totalProjectIls));
  const balanceAfterDepositIls = roundIls(Math.max(0, totalProjectIls - depositDueIls));
  const referralCreditAppliedIls = roundIls(Math.min(credit, depositDueIls));
  const dueNowIls = roundIls(Math.max(0, depositDueIls - referralCreditAppliedIls));

  return {
    estimatedGuests: guests,
    estimatedResponses,
    channels: input.channels,
    lineItems,
    usageBeforeDiscountIls,
    usageAfterDiscountIls,
    internalCostFloorIls,
    minimumCommitmentIls: floorIls,
    minimumCommitmentApplied,
    depositDueIls,
    totalProjectIls,
    balanceAfterDepositIls,
    referralCreditAppliedIls,
    dueNowIls,
    trialInviteCap: card.trialInviteCap,
    foundingLabel: "מסלול יוזמים ראשונים",
    billingModel: "per_response",
    quoteValid: true,
  };
}

/** Every valid quote must stay at or above internal cost floor (for tests). */
export function quoteMeetsCostFloor(quote: FoundingQuote): boolean {
  if (!quote.quoteValid) return true;
  return quote.totalProjectIls >= quote.internalCostFloorIls;
}
