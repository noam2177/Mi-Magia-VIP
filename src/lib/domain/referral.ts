import { FOUNDING_RATE_CARD } from "./pricing";

export type ReferralCreditRow = {
  id: string;
  beneficiary_lead_id: string;
  friend_lead_id: string;
  amount_ils: number;
  reason: "friend_deposit_paid";
  created_at: string;
};

/** When a referred lead pays deposit, credit the referrer. */
export function referralCreditForFriendDeposit(): number {
  return FOUNDING_RATE_CARD.referralDepositCreditIls;
}

export function sumReferralCredits(rows: { amount_ils: number }[]): number {
  return rows.reduce((s, r) => s + r.amount_ils, 0);
}
