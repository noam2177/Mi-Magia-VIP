import { db } from "@/lib/db";

/** ערך מצוטט לפילטר PostgREST (תומך בעברית, מקפים ורווחים) */
export function postgrestEq(column: string, value: string): string {
  const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '""');
  return `${column}.eq."${escaped}"`;
}

export async function findInviteeId(phone?: string | null, fullName?: string | null): Promise<string | null> {
  const filters: string[] = [];
  const p = phone?.trim();
  const n = fullName?.trim();
  if (p) filters.push(postgrestEq("phone", p));
  if (n) filters.push(postgrestEq("full_name", n));
  if (filters.length === 0) return null;

  const { data, error } = await db
    .from("invitees")
    .select("id")
    .or(filters.join(","))
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[invitees] lookup failed", error.message);
    return null;
  }
  return data?.id ?? null;
}

export async function insertInvitee(
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
