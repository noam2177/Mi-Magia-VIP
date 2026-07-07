// Direct Supabase writes for the RSVP/register flow. Anonymous access is
// permitted by RLS — the app uses a client-side admin gate, not real auth.

import { db } from "@/lib/db";

export type RsvpSubmitInput = {
  full_name?: string | null;
  phone?: string | null;
  status?: "attending" | "not_attending" | null;
  guests?: number;
  sleep?: string | null;
  guest_question?: string | null;
  responded_at?: string | null;
  is_self_registered?: boolean;
  mode?: "upsert" | "register_only";
};

export type RsvpSubmitResult =
  | { existing: boolean; id: string }
  | { error: string };

async function findExistingInviteeId(
  phone?: string | null,
  fullName?: string | null,
): Promise<string | null> {
  const p = phone?.trim();
  const n = fullName?.trim();
  if (!p && !n) return null;
  const esc = (v: string) => v.replace(/\\/g, "\\\\").replace(/"/g, '""');
  const filters: string[] = [];
  if (p) filters.push(`phone.eq."${esc(p)}"`);
  if (n) filters.push(`full_name.eq."${esc(n)}"`);
  const { data, error } = await db
    .from("invitees")
    .select("id")
    .or(filters.join(","))
    .limit(1)
    .maybeSingle();
  if (error) {
    console.warn("[rsvp] lookup", error.message);
    return null;
  }
  return (data?.id as string | undefined) ?? null;
}

/** Submit an RSVP or self-registration. */
export async function submitRsvp(input: RsvpSubmitInput): Promise<RsvpSubmitResult> {
  const existingId = await findExistingInviteeId(input.phone, input.full_name);

  if (existingId && input.mode === "register_only") {
    return { existing: true, id: existingId };
  }

  const record = {
    full_name: input.full_name ?? null,
    phone: input.phone ?? null,
    status: input.status ?? null,
    guests: input.status === "attending" ? input.guests ?? 1 : 1,
    sleep: input.sleep ?? null,
    guest_question: input.guest_question ?? null,
    responded_at: input.responded_at ?? null,
    is_self_registered: input.is_self_registered ?? false,
  };

  if (existingId) {
    const { error } = await db.from("invitees").update(record).eq("id", existingId);
    if (error) return { error: error.message };
    return { existing: true, id: existingId };
  }

  let { data, error } = await db.from("invitees").insert(record).select("id").single();
  if (error?.message?.includes("is_self_registered")) {
    const { is_self_registered: _skip, ...fallback } = record;
    ({ data, error } = await db.from("invitees").insert(fallback).select("id").single());
  }
  if (error) return { error: error.message };
  if (!data?.id) return { error: "לא התקבל מזהה רשומה" };
  return { existing: false, id: data.id as string };
}

// ---------------------------------------------------------------------------
// Admin panel helper.
// ---------------------------------------------------------------------------

export async function insertInviteeAdmin(
  record: Record<string, unknown>,
): Promise<{ id: string } | { error: string }> {
  let { data, error } = await db.from("invitees").insert(record).select("id").single();

  if (error?.message?.includes("is_self_registered")) {
    const { is_self_registered: _skip, ...fallback } = record;
    ({ data, error } = await db.from("invitees").insert(fallback).select("id").single());
  }

  if (error) return { error: error.message };
  if (!data?.id) return { error: "לא התקבל מזהה רשומה" };
  return { id: data.id };
}
