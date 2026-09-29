/** Israeli phone normalization for wa.me and dedup lookups. */

export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (!digits) return null;
  if (digits.startsWith("0")) digits = "972" + digits.slice(1);
  else if (digits.length === 9 && digits.startsWith("5")) digits = "972" + digits;
  if (digits.startsWith("972")) {
    return digits.length === 11 || digits.length === 12 ? digits : null;
  }
  if (digits.length < 10 || digits.length > 15) return null;
  return digits;
}

/** wa.me international digits (no +). */
export function phoneToWaMe(raw: string | null | undefined): string | null {
  return normalizePhone(raw);
}

export function phonesEquivalent(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = normalizePhone(a);
  const nb = normalizePhone(b);
  if (!na || !nb) return false;
  return na === nb;
}
