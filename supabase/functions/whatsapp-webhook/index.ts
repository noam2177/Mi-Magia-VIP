/**
 * WhatsApp Cloud API webhook — deterministic bot, 0 LLM (ADR-011).
 * Deploy: supabase functions deploy whatsapp-webhook
 * Env: META_APP_SECRET, META_VERIFY_TOKEN, SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-hub-signature-256",
};

async function verifySignature(raw: ArrayBuffer, header: string | null, secret: string): Promise<boolean> {
  if (!header?.startsWith("sha256=") || !secret) return false;
  const received = header.slice(7);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, raw);
  const expected = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return received === expected;
}

/** In-memory sessions — replace with Redis/DB for multi-instance (post E2). */
const sessions = new Map<string, { state: string; status: string; guestCount: number }>();

function botReply(token: string, text: string): string {
  let s = sessions.get(token) ?? { state: "awaiting_rsvp", status: "pending", guestCount: 1 };
  const t = text.trim();
  if (s.state === "complete") {
    return s.status === "attending"
      ? `כבר רשמנו הגעה (${s.guestCount} אורחים).`
      : "כבר רשמנו שלא תוכלו להגיע.";
  }
  if (s.state === "awaiting_rsvp") {
    if (t === "1") {
      s = { ...s, state: "awaiting_guest_count", status: "attending" };
      sessions.set(token, s);
      return "כמה אורחים? השב מספר בין 1 ל-5.";
    }
    if (t === "2") {
      s = { ...s, state: "complete", status: "declined" };
      sessions.set(token, s);
      return "תודה! רשמנו שלא תוכלו להגיע.";
    }
    return "השב 1 לאישור, 2 אם לא.";
  }
  if (s.state === "awaiting_guest_count" && ["1", "2", "3", "4", "5"].includes(t)) {
    s = { ...s, state: "complete", guestCount: Number(t) };
    sessions.set(token, s);
    return `מעולה! ${t} אורחים. נתראה באירוע 🎉`;
  }
  return "השב מספר בין 1 ל-5.";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const verifyToken = Deno.env.get("META_VERIFY_TOKEN") ?? "";
  const appSecret = Deno.env.get("META_APP_SECRET") ?? "";

  if (req.method === "GET") {
    const url = new URL(req.url);
    if (url.searchParams.get("hub.mode") === "subscribe" && url.searchParams.get("hub.verify_token") === verifyToken) {
      return new Response(url.searchParams.get("hub.challenge") ?? "", { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  }

  const raw = await req.arrayBuffer();
  const sig = req.headers.get("x-hub-signature-256");
  if (!(await verifySignature(raw, sig, appSecret))) {
    return new Response("Invalid signature", { status: 401 });
  }

  const body = JSON.parse(new TextDecoder().decode(raw));
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const msg of change.value?.messages ?? []) {
        const from = msg.from as string;
        const text = msg.text?.body ?? "";
        const { data: invitee } = await supabase
          .from("invitees")
          .select("guest_token, id")
          .eq("phone", from)
          .maybeSingle();
        const token = invitee?.guest_token ?? from;
        const reply = botReply(token, text);
        if (invitee?.id && (text === "1" || text === "2" || ["1", "2", "3", "4", "5"].includes(text))) {
          const patch: Record<string, unknown> = { responded_at: new Date().toISOString() };
          const sess = sessions.get(token);
          if (sess?.state === "complete") {
            patch.status = sess.status === "attending" ? "attending" : "not_attending";
            patch.guests = sess.guestCount;
          }
          await supabase.from("invitees").update(patch).eq("id", invitee.id);
        }
        // Outbound send requires Meta API token + approved template outside 24h window — wire in E-3
        console.log(JSON.stringify({ from, reply, token }));
      }
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
