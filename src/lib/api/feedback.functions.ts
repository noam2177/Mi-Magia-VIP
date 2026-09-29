import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { BRAND } from "@/lib/brand";

function getOperatorEnv() {
  return {
    to: process.env.OPERATOR_NOTIFY_EMAIL?.trim() || "",
    resendKey: process.env.RESEND_API_KEY?.trim() || "",
    from: process.env.RESEND_FROM?.trim() || BRAND.mailFrom,
  };
}

async function emailOperator(subject: string, text: string) {
  const env = getOperatorEnv();
  if (!env.to || !env.resendKey) {
    console.warn("[feedback] operator email skipped — missing OPERATOR_NOTIFY_EMAIL or RESEND_API_KEY");
    console.info(text);
    return;
  }
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: env.from, to: [env.to], subject, text }),
  });
}

export const submitCustomerFeedback = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      message: z.string().trim().min(3, "כתבו לפחות כמה מילים").max(4000),
      pageUrl: z.string().max(500).optional(),
      organizerEmail: z.string().email().optional().or(z.literal("")),
      accessToken: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    let eventId: string | null = null;
    let leadId: string | null = null;

    if (data.accessToken) {
      const { data: event } = await supabaseAdmin
        .from("events")
        .select("id, lead_id")
        .eq("organizer_access_token", data.accessToken)
        .maybeSingle();
      eventId = event?.id ?? null;
      leadId = event?.lead_id ?? null;
    }

    const { error } = await supabaseAdmin.from("customer_feedback").insert({
      message: data.message.trim(),
      page_url: data.pageUrl ?? null,
      organizer_email: data.organizerEmail || null,
      event_id: eventId,
      lead_id: leadId,
    });

    if (error) {
      console.warn("[feedback] db insert failed", error.message);
    }

    const subject = `${BRAND.name} — משוב / תקלה מלקוח`;
    const text = [
      data.message.trim(),
      "",
      data.pageUrl ? `עמוד: ${data.pageUrl}` : "",
      data.organizerEmail ? `מייל: ${data.organizerEmail}` : "",
      eventId ? `event_id: ${eventId}` : "",
      leadId ? `lead_id: ${leadId}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    await emailOperator(subject, text);
    return { ok: true };
  });
