import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildStoragePath, getImageContentType } from "@/lib/image-upload";

const EVENT_IMAGES_BUCKET = "event-images";

async function assertCallerIsAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error("Failed to verify admin role");
  if (!data) throw new Error("Forbidden: admin role required");
}

/**
 * First-run: create the very first admin. Only works if there are no admins
 * yet. Idempotent — after an admin exists it always refuses.
 */
export const claimFirstAdmin = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      email: z.string().email(),
      password: z.string().min(8),
    }),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Only allowed when no admin exists yet
    const { count, error: countError } = await supabaseAdmin
      .from("user_roles")
      .select("user_id", { count: "exact", head: true })
      .eq("role", "admin");
    if (countError) throw new Error(countError.message);
    if ((count ?? 0) > 0) {
      throw new Error("כבר קיים חשבון מנהל — פנה למנהל קיים לקבלת הרשאות");
    }

    // Try to create the user; if the email already exists, look them up
    let userId: string | null = null;
    const { data: created, error: createErr } =
      await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
      });

    if (created?.user) {
      userId = created.user.id;
    } else if (createErr && /already registered|already exists/i.test(createErr.message)) {
      const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
      if (listErr) throw new Error(listErr.message);
      const existing = list.users.find(
        (u) => u.email?.toLowerCase() === data.email.toLowerCase(),
      );
      if (!existing) throw new Error("לא נמצא משתמש עם כתובת זו");
      userId = existing.id;
    } else if (createErr) {
      throw new Error(createErr.message);
    }

    if (!userId) throw new Error("יצירת המשתמש נכשלה");

    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: "admin" });
    if (roleErr && !/duplicate/i.test(roleErr.message)) {
      throw new Error(roleErr.message);
    }

    return { ok: true as const };
  });

/**
 * Upload an image to the event-images bucket. Requires an authenticated
 * admin.
 */
export const uploadEventImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      contentType: z.string().min(1),
      base64: z.string().min(1),
      fileName: z.string().optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    await assertCallerIsAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const path = buildStoragePath({
      name: data.fileName || "upload.jpg",
      type: data.contentType,
    } as File);

    const buffer = Buffer.from(data.base64, "base64");
    const contentType =
      data.contentType || getImageContentType({ type: data.contentType } as File);

    const { error } = await supabaseAdmin.storage
      .from(EVENT_IMAGES_BUCKET)
      .upload(path, buffer, {
        contentType,
        upsert: false,
        cacheControl: "3600",
      });
    if (error) throw new Error(error.message);

    // Private bucket — return a long-lived signed URL
    const { data: signed, error: signError } = await supabaseAdmin.storage
      .from(EVENT_IMAGES_BUCKET)
      .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
    if (signError) throw new Error(signError.message);
    return { publicUrl: signed.signedUrl };
  });

// ============================================================================
// Public RSVP flow — anonymous callers.
//
// RLS blocks the anon Data API from reading/writing invitees or
// admin_notifications, so RSVP goes through these server functions using the
// service-role client. Each function is narrowly scoped to a single legitimate
// use case — no arbitrary SELECT/UPDATE/DELETE surface is exposed.
// ============================================================================

const rsvpPayloadSchema = z.object({
  full_name: z.string().trim().max(120).optional().nullable(),
  phone: z.string().trim().max(40).optional().nullable(),
  status: z.enum(["attending", "not_attending"]).nullable().optional(),
  guests: z.number().int().min(1).max(20).optional(),
  sleep: z.string().max(200).nullable().optional(),
  guest_question: z.string().max(2000).nullable().optional(),
  responded_at: z.string().nullable().optional(),
  is_self_registered: z.boolean().optional(),
  mode: z.enum(["upsert", "register_only"]).default("upsert"),
});

async function findExistingInviteeId(
  phone?: string | null,
  fullName?: string | null,
): Promise<string | null> {
  const p = phone?.trim();
  const n = fullName?.trim();
  if (!p && !n) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const filters: string[] = [];
  const esc = (v: string) => v.replace(/\\/g, "\\\\").replace(/"/g, '""');
  if (p) filters.push(`phone.eq."${esc(p)}"`);
  if (n) filters.push(`full_name.eq."${esc(n)}"`);
  const { data, error } = await supabaseAdmin
    .from("invitees")
    .select("id")
    .or(filters.join(","))
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("[submitRsvp] lookup", error.message);
    return null;
  }
  return data?.id ?? null;
}

/** Submit or update an RSVP. Public — no auth required. */
export const submitRsvpPublic = createServerFn({ method: "POST" })
  .inputValidator(rsvpPayloadSchema)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const existingId = await findExistingInviteeId(data.phone, data.full_name);

    if (existingId && data.mode === "register_only") {
      return { existing: true as const, id: existingId };
    }

    const record = {
      full_name: data.full_name ?? null,
      phone: data.phone ?? null,
      status: data.status ?? null,
      guests: data.status === "attending" ? data.guests ?? 1 : 1,
      sleep: data.sleep ?? null,
      guest_question: data.guest_question ?? null,
      responded_at: data.responded_at ?? null,
      is_self_registered: data.is_self_registered ?? false,
    };

    if (existingId) {
      const { error } = await supabaseAdmin
        .from("invitees")
        .update(record)
        .eq("id", existingId);
      if (error) throw new Error(error.message);
      return { existing: true as const, id: existingId };
    }

    const { data: created, error } = await supabaseAdmin
      .from("invitees")
      .insert(record)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { existing: false as const, id: created.id as string };
  });

const allowedNotificationTypes = [
  "rsvp_attending",
  "rsvp_not_attending",
  "rsvp_updated",
  "self_registration",
  "guest_question",
  "invite_added",
] as const;

/**
 * Insert an admin notification tied to a specific invitee. Public — used
 * by the anonymous RSVP flow. Guarded so callers can only post notifications
 * that reference a real invitee id, and only with the fixed set of types the
 * app uses.
 */
export const publishRsvpNotification = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      type: z.enum(allowedNotificationTypes),
      invitee_id: z.string().uuid(),
      title: z.string().max(200),
      body: z.string().max(2000),
      meta: z.record(z.string(), z.unknown()).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Sanity: only allow notifications for invitees that actually exist
    const { data: invitee, error: lookupErr } = await supabaseAdmin
      .from("invitees")
      .select("id")
      .eq("id", data.invitee_id)
      .maybeSingle();
    if (lookupErr) throw new Error(lookupErr.message);
    if (!invitee) throw new Error("Invitee not found");

    const { error } = await supabaseAdmin.from("admin_notifications").insert({
      type: data.type,
      invitee_id: data.invitee_id,
      title: data.title,
      body: data.body,
      meta: data.meta ?? {},
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
