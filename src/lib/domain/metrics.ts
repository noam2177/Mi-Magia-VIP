import type { Invitee, RsvpMetrics } from "./types";
import { normalizePhone } from "./phone";

export function computeRsvpMetrics(list: Invitee[]): RsvpMetrics {
  const total = list.length;
  const yes = list.filter((i) => i.status === "attending").length;
  const no = list.filter((i) => i.status === "not_attending").length;
  const pending = list.filter((i) => !i.status).length;
  const guestsTotal = list
    .filter((i) => i.status === "attending")
    .reduce((s, i) => s + (i.guests || 1), 0);
  return { total, yes, no, pending, guestsTotal };
}

/** Share of invitees who answered (yes or no). Empty list → 0. */
export function computeResponseRate(metrics: RsvpMetrics): number {
  if (metrics.total <= 0) return 0;
  return (metrics.yes + metrics.no) / metrics.total;
}

export function filterInvitees(list: Invitee[], query: string): Invitee[] {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  const qPhone = normalizePhone(query);
  return list.filter((i) => {
    if ((i.full_name || "").toLowerCase().includes(q)) return true;
    const phone = i.phone || "";
    if (phone.toLowerCase().includes(q)) return true;
    return Boolean(qPhone && normalizePhone(phone) === qPhone);
  });
}
