/**
 * Meta WhatsApp webhook HMAC verification (R7 fix #2).
 * For Edge Functions / Nitro server routes — never skip in production.
 */

export async function verifyMetaWebhookSignature(
  rawBody: ArrayBuffer | Uint8Array,
  signatureHeader: string | null | undefined,
  appSecret: string,
): Promise<boolean> {
  if (!signatureHeader || !appSecret) return false;
  const prefix = "sha256=";
  if (!signatureHeader.startsWith(prefix)) return false;
  const received = signatureHeader.slice(prefix.length);

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, rawBody);
  const expected = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (received.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < received.length; i++) {
    diff |= received.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}
