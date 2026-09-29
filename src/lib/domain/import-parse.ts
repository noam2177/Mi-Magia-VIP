import type { InviteeInsert } from "./types";
import { normalizePhone } from "./phone";

const NAME_KEYS = ["full_name", "name", "שם", "שם מלא"];
const PHONE_KEYS = ["phone", "טלפון", "mobile", "נייד"];

export function extractRecordFromRow(row: Record<string, unknown>): InviteeInsert {
  const lower: Record<string, unknown> = {};
  for (const k of Object.keys(row)) {
    lower[k.toString().trim().toLowerCase()] = row[k];
  }
  let name: string | null = null;
  for (const k of NAME_KEYS) {
    if (lower[k] != null && String(lower[k]).trim()) {
      name = String(lower[k]).trim();
      break;
    }
  }
  let phone: string | null = null;
  for (const k of PHONE_KEYS) {
    if (lower[k] != null && String(lower[k]).trim()) {
      phone = String(lower[k]).trim();
      break;
    }
  }
  return { full_name: name, phone: phone ? normalizePhone(phone) : null };
}

/** Smart parser: one line → name + phone. */
export function parseInviteLine(line: string): InviteeInsert {
  const trimmed = line.trim();
  const phoneMatch = trimmed.match(/[\d+][\d\-+\s()]{6,}/);
  const phoneRaw = phoneMatch ? phoneMatch[0].trim() : null;
  const name = phoneRaw
    ? trimmed.replace(phoneRaw, "").replace(/[,\t|;-]+/g, " ").trim()
    : trimmed;
  return {
    full_name: name || null,
    phone: phoneRaw ? normalizePhone(phoneRaw) : null,
  };
}

export function parseInviteTextBlock(text: string): InviteeInsert[] {
  return dedupeInvitees(
    text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map(parseInviteLine)
      .filter((r) => r.full_name || r.phone),
  );
}

/** One row per normalized phone. Name-only rows stay. First phone wins. */
export function dedupeInvitees(rows: InviteeInsert[]): InviteeInsert[] {
  const seen = new Set<string>();
  const out: InviteeInsert[] = [];
  for (const row of rows) {
    const phone = row.phone ? normalizePhone(row.phone) : null;
    if (phone) {
      if (seen.has(phone)) continue;
      seen.add(phone);
    }
    out.push({ ...row, phone });
  }
  return out;
}
