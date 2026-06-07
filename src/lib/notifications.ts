import { db } from "@/lib/db";
import { getSleepLabel } from "@/lib/sleep-options";

export type NotificationType =
  | "rsvp_attending"
  | "rsvp_not_attending"
  | "rsvp_updated"
  | "self_registration"
  | "guest_question";

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

export function getNotificationsLastSeen(adminName: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(`${LAST_SEEN_KEY}_${adminName}`);
}

export function markNotificationsSeen(adminName: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(`${LAST_SEEN_KEY}_${adminName}`, new Date().toISOString());
}

export function countUnreadSinceLastSeen(
  notifications: AdminNotification[],
  adminName: string,
): number {
  const lastSeen = getNotificationsLastSeen(adminName);
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

async function pushNotification(input: {
  type: NotificationType;
  invitee_id?: string | null;
  title: string;
  body: string;
  meta?: Record<string, unknown>;
}) {
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
  });

  if (params.guestQuestion?.trim()) {
    await pushNotification({
      type: "guest_question",
      invitee_id: params.inviteeId,
      title: `שאלה חדשה מ${name}`,
      body: params.guestQuestion.trim(),
      meta: { question: params.guestQuestion.trim() },
    });
  }
}

export async function notifySelfRegistration(params: {
  inviteeId: string;
  fullName: string;
  phone: string;
  guests: number;
}) {
  const name = displayName(params.fullName, params.phone);
  await pushNotification({
    type: "self_registration",
    invitee_id: params.inviteeId,
    title: `הרשמה חדשה: ${name}`,
    body: `טלפון: ${params.phone} · אורחים: ${params.guests}`,
    meta: { phone: params.phone, guests: params.guests },
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
