import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { PriceCalculator } from "@/components/onboarding/PriceCalculator";
import { getOrganizerWorkspaceByToken } from "@/lib/api/onboarding.functions";
import type { InviteChannels } from "@/lib/domain/pricing";
import { EVENT_TYPES } from "@/lib/domain/onboarding";
import { WorkspaceTrialInvite } from "@/components/onboarding/WorkspaceTrialInvite";

export const Route = createFileRoute("/w/$accessToken")({
  component: OrganizerWorkspace,
});

type WorkspaceData = Awaited<ReturnType<typeof getOrganizerWorkspaceByToken>>;

function OrganizerWorkspace() {
  const { accessToken } = Route.useParams();
  const [data, setData] = useState<WorkspaceData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await getOrganizerWorkspaceByToken({ data: { accessToken } });
      setData(res);
    } catch (e) {
      console.error(e);
      toast.error("לא נמצאה סביבת עבודה. בדקו את הקישור.");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [accessToken]);

  if (loading) {
    return <div className="p-8 text-center" dir="rtl">טוען...</div>;
  }

  if (!data) {
    return (
      <div className="p-8 text-center" dir="rtl">
        <p>קישור לא תקין או שהמיגרציה עדיין לא הוחלה ב-Supabase.</p>
        <Button asChild className="mt-4">
          <Link to="/start">הרשמה מחדש</Link>
        </Button>
      </div>
    );
  }

  const eventLabel =
    EVENT_TYPES.find((t) => t.id === data.event.eventType)?.label ?? data.event.eventType;

  const raw = (data.lead?.channels ?? data.event.channels ?? {}) as InviteChannels;
  const ch: InviteChannels = {
    whatsapp: Boolean(raw.whatsapp),
    email: Boolean(raw.email),
    phone: Boolean(raw.phone),
  };

  const trialLeft =
    (data.event.trialInvitesCap ?? 5) - (data.event.trialInvitesSent ?? 0);

  return (
    <div className="min-h-screen bg-background px-4 py-8" dir="rtl">
      <div className="mx-auto max-w-3xl space-y-6">
        <header>
          <h1 className="text-2xl font-bold">סביבת העבודה שלכם</h1>
          <p className="text-muted-foreground">
            {data.lead?.organizer_name}
            {data.lead?.partner_name ? ` ו${data.lead.partner_name}` : ""} · {eventLabel}
          </p>
        </header>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
          <strong>מצב דמו:</strong> נותרו {Math.max(0, trialLeft)} מתוך {data.event.trialInvitesCap} הזמנות
          חינם. אחרי מקדמה בביט (אחרי אישורנו) — בלי מגבלה.
          {data.event.paymentStatus === "unpaid" && (
            <span className="block mt-1">מקדמה משוערת: {data.quote.dueNowIls} ₪</span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              navigator.clipboard.writeText(data.shareUrl);
              toast.success("הקישור הועתק — שלחו לבן/בת הזוג");
            }}
          >
            העתקת קישור לשיתוף
          </Button>
          <Button asChild variant="outline">
            <Link to="/e/$slug" params={{ slug: data.event.slug }}>תצוגת אורח (דמו)</Link>
          </Button>
        </div>

        <PriceCalculator
          guests={data.lead?.estimated_guests ?? 100}
          channels={ch}
          onGuestsChange={() => {}}
          onChannelsChange={() => {}}
          readOnly
        />

        <WorkspaceTrialInvite
          accessToken={accessToken}
          channels={ch}
          trialInvitesSent={data.event.trialInvitesSent ?? 0}
          trialInvitesCap={data.event.trialInvitesCap ?? 5}
          canSend={data.trial.ok}
          onSent={load}
        />

        <p className="text-sm text-muted-foreground">
          קוד מביא חבר: <strong dir="ltr">{data.lead?.referral_code}</strong>
        </p>
      </div>
    </div>
  );
}
