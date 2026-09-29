import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { recordTrialInviteSend } from "@/lib/api/onboarding.functions";
import type { InviteChannels } from "@/lib/domain/pricing";

type Props = {
  accessToken: string;
  channels: InviteChannels;
  trialInvitesSent: number;
  trialInvitesCap: number;
  canSend: boolean;
  onSent: () => void;
};

export function WorkspaceTrialInvite({
  accessToken,
  channels,
  trialInvitesSent,
  trialInvitesCap,
  canSend,
  onSent,
}: Props) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async (channel: "whatsapp" | "email" | "phone") => {
    if (!canSend) {
      toast.error("הגעתם למכסת הדמו או שחסר סוג אירוע");
      return;
    }
    setBusy(true);
    try {
      const res = await recordTrialInviteSend({
        data: {
          accessToken,
          channel,
          guestName: name,
          guestPhone: phone || undefined,
          guestEmail: email || undefined,
        },
      });
      window.open(res.actionUrl, "_blank", "noopener,noreferrer");
      toast.success(`הזמנה נשלחה (${res.trialInvitesSent}/${res.trialInvitesCap})`);
      setName("");
      setPhone("");
      setEmail("");
      onSent();
    } catch (e: any) {
      const msg = e?.message ?? "";
      if (msg === "missing_contact_for_channel") {
        toast.error("חסר טלפון או מייל לערוץ שנבחר");
      } else if (msg === "trial_cap") {
        toast.error("הגעתם ל-5 הזמנות דמו");
      } else {
        toast.error("לא הצלחנו לשלוח. נסו שוב.");
      }
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-xl border p-4 space-y-3" dir="rtl">
      <h2 className="font-semibold">שליחת הזמנה (דמו)</h2>
      <p className="text-sm text-muted-foreground">
        נותרו {Math.max(0, trialInvitesCap - trialInvitesSent)} מתוך {trialInvitesCap}. כל לחיצה פותחת
        WhatsApp / מייל / שיחה ומונה במערכת.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label>שם מוזמן/ה</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label>טלפון</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" className="text-end" />
        </div>
        <div className="md:col-span-2">
          <Label>מייל (לשליחה במייל)</Label>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" className="text-end" />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {channels.whatsapp && (
          <Button type="button" disabled={busy || !name} onClick={() => send("whatsapp")}>
            WhatsApp
          </Button>
        )}
        {channels.email && (
          <Button type="button" variant="secondary" disabled={busy || !name} onClick={() => send("email")}>
            מייל
          </Button>
        )}
        {channels.phone && (
          <Button type="button" variant="outline" disabled={busy || !name} onClick={() => send("phone")}>
            טלפון
          </Button>
        )}
      </div>
    </section>
  );
}
