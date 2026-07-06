import { db } from "@/lib/db";
import { publishRsvpNotification } from "@/lib/api/admin.functions";
import { getSleepLabel } from "@/lib/sleep-options";

export type NotificationType =
  | "rsvp_attending"
  | "rsvp_not_attending"
  | "rsvp_updated"
  | "self_registration"
  | "guest_question"
  | "invite_added";

export type AdminNotification = {
  id: string;
  type: NotificationType;
  invitee_id: string | null;
  title: string;
  body: string;
  meta: Record<string, unknown>;
  created_at: string;
};

const LAST_SEEN_KEY = "admin_notifications_last_seen_v1";

export function getNotificationsLastSeen(adminKey: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(`${LAST_SEEN_KEY}_${adminKey}`);
}

export function markNotificationsSeen(adminKey: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${LAST_SEEN_KEY}_${adminKey}`, new Date().toISOString());
}

export function countUnreadSinceLastSeen(
  notifications: AdminNotification[],
  adminKey: string,
): number {
  const lastSeen = getNotificationsLastSeen(adminKey);
  if (!lastSeen) return notifications.length;
  return notifications.filter((n) => n.created_at > lastSeen).length;
}

export function formatNotificationTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("he-IL", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

type PushInput = {
  type: NotificationType;
  invitee_id?: string | null;
  title: string;
  body: string;
  meta?: Record<string, unknown>;
  /** true when the caller is an anonymous public user (RSVP flow). */
  fromPublic?: boolean;
};

async function pushNotification(input: PushInput) {
  if (input.fromPublic) {
    // Public callers cannot INSERT directly into admin_notifications (RLS).
    // Route through the guarded server function — it only accepts entries
    // tied to an existing invitee id.
    if (!input.invitee_id) return;
    try {
      await publishRsvpNotification({
        data: {
          type: input.type,
          invitee_id: input.invitee_id,
          title: input.title,
          body: input.body,
          meta: input.meta,
        },
      });
    } catch (err) {
      console.warn("[notifications] public publish failed", err);
    }
    return;
  }
  const { error } = await db.from("admin_notifications").insert({
    type: input.type,
    invitee_id: input.invitee_id ?? null,
    title: input.title,
    body: input.body,
    meta: input.meta ?? {},
  });
  if (error) console.error("[notifications]", error.message);
}

function displayName(fullName?: string | null, phone?: string | null) {
  return fullName?.trim() || phone?.trim() || "מוזמן";
}

export async function notifyRsvpSubmit(params: {
  inviteeId: string;
  fullName?: string | null;
  phone?: string | null;
  status: "attending" | "not_attending";
  guests: number;
  sleepLabel?: string | null;
  blessing?: string | null;
  guestQuestion?: string | null;
  isUpdate: boolean;
  fromPublic?: boolean;
}) {
  const name = displayName(params.fullName, params.phone);
  const details: string[] = [];

  if (params.status === "attending") {
    details.push(`אורחים: ${params.guests}`);
    if (params.sleepLabel) details.push(`לינה: ${params.sleepLabel}`);
  }
  if (params.blessing?.trim()) details.push(`ברכה: ${params.blessing.trim()}`);

  const type: NotificationType = params.isUpdate
    ? "rsvp_updated"
    : params.status === "attending"
      ? "rsvp_attending"
      : "rsvp_not_attending";

  const title =
    type === "rsvp_updated"
      ? `${name} עדכן/ה אישור הגעה`
      : params.status === "attending"
        ? `${name} אישר/ה הגעה`
        : `${name} סימן/ה שלא מגיע/ה`;

  const statusText = params.status === "attending" ? "מגיע/ה" : "לא מגיע/ה";
  const body = [statusText, ...details].join(" · ");

  await pushNotification({
    type,
    invitee_id: params.inviteeId,
    title,
    body,
    meta: { status: params.status, guests: params.guests },
    fromPublic: params.fromPublic,
  });

  if (params.guestQuestion?.trim()) {
    await pushNotification({
      type: "guest_question",
      invitee_id: params.inviteeId,
      title: `שאלה חדשה מ${name}`,
      body: params.guestQuestion.trim(),
      meta: { question: params.guestQuestion.trim() },
      fromPublic: params.fromPublic,
    });
  }
}

export async function notifyInviteeAdded(params: {
  inviteeId: string;
  fullName?: string | null;
  phone?: string | null;
  source?: "admin" | "import" | "rsvp" | "self_registration";
  batchCount?: number;
  fromPublic?: boolean;
}) {
  const name = displayName(params.fullName, params.phone);
  const sourceLabel =
    params.source === "import"
      ? "ייבוא"
      : params.source === "rsvp"
        ? "אישור הגעה"
        : params.source === "self_registration"
          ? "הרשמה עצמית"
          : "פאנל ניהול";

  if (params.batchCount && params.batchCount > 1 && !params.fullName && !params.phone) {
    await pushNotification({
      type: "invite_added",
      invitee_id: params.inviteeId || null,
      title: `נוספו ${params.batchCount} מוזמנים חדשים`,
      body: `מקור: ${sourceLabel}`,
      meta: { count: params.batchCount, source: params.source },
      fromPublic: params.fromPublic,
    });
    return;
  }

  await pushNotification({
    type: "invite_added",
    invitee_id: params.inviteeId,
    title: `מוזמן חדש: ${name}`,
    body: [params.phone?.trim() && `טלפון: ${params.phone.trim()}`, `מקור: ${sourceLabel}`]
      .filter(Boolean)
      .join(" · "),
    meta: { source: params.source },
    fromPublic: params.fromPublic,
  });
}

export async function notifyInviteesAddedBatch(
  rows: Array<{ id: string; full_name: string | null; phone: string | null }>,
  source: "admin" | "import",
) {
  if (rows.length === 0) return;
  if (rows.length > 8) {
    await notifyInviteeAdded({
      inviteeId: rows[0].id,
      source,
      batchCount: rows.length,
    });
    return;
  }
  await Promise.all(
    rows.map((row) =>
      notifyInviteeAdded({
        inviteeId: row.id,
        fullName: row.full_name,
        phone: row.phone,
        source,
      }),
    ),
  );
}

export async function notifySelfRegistration(params: {
  inviteeId: string;
  fullName: string;
  phone: string;
  guests: number;
  status?: "attending" | "not_attending" | null;
  sleepLabel?: string | null;
  blessing?: string | null;
  guestQuestion?: string | null;
  fromPublic?: boolean;
}) {
  const name = displayName(params.fullName, params.phone);
  const details: string[] = [`טלפון: ${params.phone}`, `אורחים: ${params.guests}`];

  if (params.status === "attending") {
    details.push("מגיע/ה");
    if (params.sleepLabel) details.push(`לינה: ${params.sleepLabel}`);
  } else if (params.status === "not_attending") {
    details.push("לא מגיע/ה");
  }
  if (params.blessing?.trim()) details.push(`ברכה: ${params.blessing.trim()}`);

  await pushNotification({
    type: "self_registration",
    invitee_id: params.inviteeId,
    title: `הרשמה חדשה: ${name}`,
    body: details.join(" · "),
    meta: { phone: params.phone, guests: params.guests, status: params.status },
    fromPublic: params.fromPublic,
  });

  if (params.guestQuestion?.trim()) {
    await pushNotification({
      type: "guest_question",
      invitee_id: params.inviteeId,
      title: `שאלה חדשה מ${name}`,
      body: params.guestQuestion.trim(),
      meta: { question: params.guestQuestion.trim() },
      fromPublic: params.fromPublic,
    });
  }
}

export async function notifyNewInviteeCreated(params: {
  inviteeId: string;
  fullName?: string | null;
  phone?: string | null;
  source: "rsvp" | "self_registration";
  fromPublic?: boolean;
}) {
  await notifyInviteeAdded({
    inviteeId: params.inviteeId,
    fullName: params.fullName,
    phone: params.phone,
    source: params.source,
    fromPublic: params.fromPublic,
  });
}

export async function notifyNewInviteeCreated(params: {
  inviteeId: string;
  fullName?: string | null;
  phone?: string | null;
  source: "rsvp" | "self_registration";
}) {
  await notifyInviteeAdded({
    inviteeId: params.inviteeId,
    fullName: params.fullName,
    phone: params.phone,
    source: params.source,
  });
}

export async function fetchNotifications(limit = 100): Promise<AdminNotification[]> {
  const { data, error } = await db
    .from("admin_notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[notifications] fetch failed", error.message);
    return [];
  }
  return (data ?? []) as AdminNotification[];
}

export function notificationTypeLabel(type: NotificationType): string {
  switch (type) {
    case "rsvp_attending":
      return "אישור הגעה";
    case "rsvp_not_attending":
      return "לא מגיע";
    case "rsvp_updated":
      return "עדכון RSVP";
    case "self_registration":
      return "הרשמה חדשה";
    case "guest_question":
      return "שאלה ממוזמן";
    case "invite_added":
      return "מוזמן חדש";
    default:
      return "התראה";
  }
}

export type GuestMessage = {
  id: string;
  full_name: string | null;
  phone: string | null;
  guest_question: string;
  status: string | null;
  guests: number;
  sleep: string | boolean | null;
  responded_at: string | null;
};

export function inviteeToGuestMessage(row: {
  id: string;
  full_name: string | null;
  phone: string | null;
  guest_question: string | null;
  status: string | null;
  guests: number;
  sleep: string | boolean | null;
  responded_at?: string | null;
}): GuestMessage | null {
  if (!row.guest_question?.trim()) return null;
  return {
    id: row.id,
    full_name: row.full_name,
    phone: row.phone,
    guest_question: row.guest_question.trim(),
    status: row.status,
    guests: row.guests,
    sleep: row.sleep,
    responded_at: row.responded_at ?? null,
  };
}

export function guestMessageSummary(row: GuestMessage) {
  const name = displayName(row.full_name, row.phone);
  const sleep = getSleepLabel(row.sleep);
  return `${name} · ${row.guest_question}${row.status ? ` · ${row.status === "attending" ? "מגיע" : "לא מגיע"}` : ""}${sleep !== "—" ? ` · ${sleep}` : ""}`;
}
