// Helpers for the anonymous public RSVP flow. All writes go through server
// functions that use the service-role client — the anon Data API has no
// direct read/write access to the invitees table.

import {
  publishRsvpNotification,
  submitRsvpPublic,
} from "@/lib/api/admin.functions";
import type { NotificationType } from "@/lib/notifications";
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

/** Submit an RSVP or self-registration. Public — used by anonymous visitors. */
export async function submitRsvp(input: RsvpSubmitInput): Promise<RsvpSubmitResult> {
  try {
    const result = await submitRsvpPublic({ data: input });
    return { existing: result.existing, id: result.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "שגיאה בשמירת האישור";
    console.error("[rsvp] submit failed", message);
    return { error: message };
  }
}

/** Publish a notification tied to a real invitee. Public — used from RSVP. */
export async function publishNotificationPublic(input: {
  type: NotificationType;
  inviteeId: string;
  title: string;
  body: string;
  meta?: Record<string, unknown>;
}): Promise<void> {
  try {
    await publishRsvpNotification({
      data: {
        type: input.type,
        invitee_id: input.inviteeId,
        title: input.title,
        body: input.body,
        meta: input.meta,
      },
    });
  } catch (err) {
    console.warn("[rsvp] notification publish failed", err);
  }
}

// ---------------------------------------------------------------------------
// Admin-only helpers (called only from the admin panel, where the user is
// authenticated and RLS grants access via the admin role).
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
