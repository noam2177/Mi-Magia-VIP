import type { InviteeInsert, RsvpFormInput } from "./types";
import { generateGuestToken } from "./guest-token";
import { normalizePhone } from "./phone";

function clampGuests(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.min(5, Math.max(1, Math.trunc(n)));
}

/** Build DB payload from validated form values. Invalid phones are dropped, not stored raw. */
export function buildRsvpPayload(values: RsvpFormInput): InviteeInsert {
  return {
    full_name: values.full_name?.trim() || null,
    phone: values.phone ? normalizePhone(values.phone) : null,
    status: values.status,
    guests: values.status === "attending" ? clampGuests(values.guests) : 1,
    sleep: values.sleep,
    blessing: values.blessing?.trim() || null,
    responded_at: new Date().toISOString(),
  };
}

function eqFilter(column: string, value: string): string {
  const cleaned = value.replace(/"/g, "").trim();
  return `${column}.eq."${cleaned}"`;
}

/** PostgREST `.or()` filter for existing invitee lookup by phone/name. */
export function buildExistingLookupOr(values: RsvpFormInput): string[] {
  const parts: string[] = [];
  if (values.phone) {
    const norm = normalizePhone(values.phone);
    const raw = values.phone.trim();
    if (raw) parts.push(eqFilter("phone", raw));
    if (norm && norm !== raw) parts.push(eqFilter("phone", norm));
  }
  if (values.full_name?.trim()) {
    parts.push(eqFilter("full_name", values.full_name.trim()));
  }
  return parts;
}

export function newInviteeWithToken(partial: InviteeInsert): InviteeInsert {
  return { ...partial, guest_token: generateGuestToken() };
}
