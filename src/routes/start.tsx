import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PriceCalculator } from "@/components/onboarding/PriceCalculator";
import {
  onboardingFormSchema,
  type OnboardingFormValues,
  ORGANIZER_AUDIENCES,
  atLeastOneChannel,
} from "@/lib/domain/onboarding";
import type { InviteChannels } from "@/lib/domain/pricing";
import {
  defaultEventTypeForAudience,
  eventTypesForAudience,
  resolveEventTemplate,
  type EventTypeId,
  type OrganizerAudienceId,
} from "@/lib/domain/event-template-defaults";
import { submitOnboardingLead } from "@/lib/api/onboarding.functions";

export const Route = createFileRoute("/start")({
  component: StartRegistration,
});

function applyAudienceTemplate(
  audience: OrganizerAudienceId,
  eventType: EventTypeId,
  setChannels: (c: InviteChannels) => void,
  setValue: (name: keyof OnboardingFormValues, value: unknown) => void,
) {
  const template = resolveEventTemplate(audience, eventType);
  setChannels(template.defaultChannels);
  setValue("organizer_audience", audience);
  setValue("event_type", eventType);
  setValue("channels", template.defaultChannels);
}

function StartRegistration() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const initialAudience: OrganizerAudienceId = "couples_families";
  const initialEvent = defaultEventTypeForAudience(initialAudience);
  const initialTemplate = resolveEventTemplate(initialAudience, initialEvent);
  const [channels, setChannels] = useState<InviteChannels>(initialTemplate.defaultChannels);
  const [audience, setAudience] = useState<OrganizerAudienceId>(initialAudience);

  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingFormSchema) as any,
    defaultValues: {
      organizer_name: "",
      partner_name: "",
      phone: "",
      email: "",
      organizer_audience: initialAudience,
      event_type: initialEvent,
      event_date: "",
      estimated_guests: 120,
      channels: initialTemplate.defaultChannels,
      notes: "",
      referred_by_code: "",
    },
  });

  const guests = form.watch("estimated_guests");
  const eventType = form.watch("event_type") as EventTypeId;
  const template = resolveEventTemplate(audience, eventType);
  const eventTypeOptions = eventTypesForAudience(audience);

  const onSubmit = async (values: OnboardingFormValues) => {
    const payload = { ...values, channels };
    if (!atLeastOneChannel(payload.channels)) {
      toast.error("בחרו לפחות ערוץ הזמנה אחד");
      return;
    }
    setSubmitting(true);
    try {
      const result = await submitOnboardingLead({ data: payload });
      sessionStorage.setItem("rsvp_workspace_url", result.workspaceUrl);
      sessionStorage.setItem("rsvp_referral_code", result.referralCode);
      navigate({ to: "/thanks" });
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "שגיאה בשליחה. נסו שוב או פנו לתמיכה.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8" dir="rtl">
      <div className="mx-auto max-w-3xl space-y-8">
        <div>
          <Link to="/" className="text-sm text-muted-foreground hover:underline">← חזרה לנחיתה</Link>
          <h1 className="mt-2 text-2xl font-bold">הרשמה לפתיחת אירוע</h1>
          <p className="text-sm text-muted-foreground">
            מיד אחרי השליחה תקבלו קישור לסביבת העבודה (גם לפני תשלום). מקדמה בביט — אחרי שנאשר.
          </p>
        </div>

        <PriceCalculator
          guests={guests}
          channels={channels}
          onGuestsChange={(n) => form.setValue("estimated_guests", n)}
          onChannelsChange={(c) => {
            setChannels(c);
            form.setValue("channels", c);
          }}
        />

        <p className="rounded-lg border border-pink-100 bg-pink-50/60 px-4 py-3 text-sm text-muted-foreground">
          <span className="font-medium text-pink-950">טמפלט ברירת מחדל:</span>{" "}
          כותרת דוגמה «{template.sampleLandingTitle}» · טון{" "}
          {template.tone === "professional" ? "עסקי" : template.tone === "neutral" ? "ניטרלי" : "חם"} ·
          ערוצים: {template.channelOrderLabel}
        </p>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 rounded-xl border p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>שם מלא (מארגן/ת)</Label>
              <Input {...form.register("organizer_name")} />
            </div>
            <div>
              <Label>{template.partnerFieldLabel}</Label>
              <Input {...form.register("partner_name")} placeholder="אופציונלי" />
            </div>
            <div>
              <Label>טלפון</Label>
              <Input {...form.register("phone")} dir="ltr" className="text-end" />
            </div>
            <div>
              <Label>מייל</Label>
              <Input type="email" {...form.register("email")} dir="ltr" className="text-end" />
            </div>
            <div>
              <Label>קהל / סוג מארגן</Label>
              <Select
                value={audience}
                onValueChange={(v) => {
                  const a = v as OrganizerAudienceId;
                  setAudience(a);
                  const nextType = defaultEventTypeForAudience(a);
                  applyAudienceTemplate(a, nextType, setChannels, form.setValue);
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ORGANIZER_AUDIENCES.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>סוג אירוע</Label>
              <Select
                value={eventType}
                onValueChange={(v) => {
                  const et = v as EventTypeId;
                  applyAudienceTemplate(audience, et, setChannels, form.setValue);
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {eventTypeOptions.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>תאריך משוער</Label>
              <Input type="date" {...form.register("event_date")} dir="ltr" className="text-end" />
            </div>
          </div>

          <div>
            <Label>קוד חבר (מביא חבר)</Label>
            <Input {...form.register("referred_by_code")} placeholder="אופציונלי" dir="ltr" className="text-end" />
          </div>

          <div>
            <Label>הערות</Label>
            <Textarea {...form.register("notes")} rows={3} />
          </div>

          <label className="flex items-start gap-2 text-sm">
            <Checkbox required className="mt-1" />
            <span>
              אני מבין/ה שעד 5 הזמנות בדמו, שהתמחור לפי מענה משוער (לא שליחה), ושיש מינימום התחייבות גם אם המענה בפועל נמוך.
            </span>
          </label>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "שולח..." : "שליחה וקבלת קישור לסביבת העבודה"}
          </Button>
        </form>
      </div>
    </div>
  );
}
