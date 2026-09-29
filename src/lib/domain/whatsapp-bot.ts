/**
 * Deterministic WhatsApp RSVP bot — 0 LLM at runtime (ADR-011).
 * Mirrors rsvp-saas-product/rsvp_bot/state_machine.py for lab parity.
 * Host metrics use attending | not_attending, never the bot word "declined".
 */

import type { RsvpStatus } from "./types";

export type BotRsvpStatus = "pending" | "attending" | "declined";

export type BotGuestState = "awaiting_rsvp" | "awaiting_guest_count" | "complete";

export type BotSession = {
  guestToken: string;
  state: BotGuestState;
  status: BotRsvpStatus;
  guestCount: number;
};

export class WhatsAppRsvpBot {
  private sessions = new Map<string, BotSession>();

  getOrCreate(guestToken: string): BotSession {
    let s = this.sessions.get(guestToken);
    if (!s) {
      s = { guestToken, state: "awaiting_rsvp", status: "pending", guestCount: 1 };
      this.sessions.set(guestToken, s);
    }
    return s;
  }

  handleInbound(guestToken: string, body: string): { reply: string; session: BotSession } {
    const text = (body || "").trim();
    const session = this.getOrCreate(guestToken);

    if (session.state === "complete") {
      return { reply: this.alreadyRecorded(session), session };
    }

    if (session.state === "awaiting_rsvp") {
      if (text === "1") {
        session.status = "attending";
        session.state = "awaiting_guest_count";
        return { reply: "כמה אורחים? השב מספר בין 1 ל-5.", session };
      }
      if (text === "2") {
        session.status = "declined";
        session.state = "complete";
        return {
          reply: "תודה! רשמנו שלא תוכלו להגיע. נשמח לראותכם באירוע אחר 💙",
          session,
        };
      }
      return { reply: "השב 1 לאישור הגעה, 2 אם לא תוכלו להגיע.", session };
    }

    if (session.state === "awaiting_guest_count") {
      if (["1", "2", "3", "4", "5"].includes(text)) {
        session.guestCount = Number(text);
        session.state = "complete";
        return {
          reply: `מעולה! רשמנו ${session.guestCount} אורחים. נתראה באירוע 🎉`,
          session,
        };
      }
      return { reply: "השב מספר בין 1 ל-5 (כולל אתכם).", session };
    }

    return { reply: "שגיאה פנימית — פנו למארגנים.", session };
  }

  /** Map a finished bot session onto the host guest-list status. */
  toInvitee(session: BotSession): { status: RsvpStatus; guests: number } {
    if (session.state !== "complete") return { status: null, guests: 1 };
    if (session.status === "attending") {
      const guests = Math.min(5, Math.max(1, Math.trunc(session.guestCount) || 1));
      return { status: "attending", guests };
    }
    if (session.status === "declined") return { status: "not_attending", guests: 1 };
    return { status: null, guests: 1 };
  }

  private alreadyRecorded(session: BotSession): string {
    if (session.status === "attending") {
      return `כבר רשמנו הגעה (${session.guestCount} אורחים). לשינוי פנו למארגנים.`;
    }
    return "כבר רשמנו שלא תוכלו להגיע. לשינוי פנו למארגנים.";
  }
}
