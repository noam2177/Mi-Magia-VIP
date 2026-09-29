import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
import { TemplatePreviewCard } from "@/components/onboarding/TemplatePreviewCard";
import {
  onboardingFormSchema,
  type OnboardingFormValues,
  EVENT_CATEGORIES,
  atLeastOneChannel,
} from "@/lib/domain/onboarding";
import type { InviteChannels } from "@/lib/domain/pricing";
import {
  defaultEventTypeForCategory,
  eventTypesForCategory,
  resolveEventTemplate,
  type EventCategoryId,
  type EventTypeId,
} from "@/lib/domain/event-template-defaults";
import { submitOnboardingLead } from "@/lib/api/onboarding.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/start")({
  validateSearch: (search: Record<string, unknown>) => ({
    category:
      search.category === "business" || search.category === "personal"
        ? (search.category as EventCategoryId)
        : undefined,
  }),
  component: StartRegistration,
});

function applyTemplate(
  category: EventCategoryId,
  eventType: EventTypeId,
  displayName: string | undefined,
  setChannels: (c: InviteChannels) => void,
  setValue: (name: keyof OnboardingFormValues, value: unknown) => void,
) {
  const template = resolveEventTemplate(category, eventType, displayName);
  setChannels(template.defaultChannels);
  setValue("event_category", category);
  setValue("event_type", eventType);
  setValue("channels", template.defaultChannels);
  if (displayName) setValue("event_display_name", displayName);
}

function StartRegistration() {
  const navigate = useNavigate();
  const { category: searchCategory } = Route.useSearch();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = useState(false);

  const initialCategory: EventCategoryId = searchCategory ?? "personal";
  const initialEvent = defaultEventTypeForCategory(initialCategory);
  const initialTemplate = resolveEventTemplate(initialCategory, initialEvent);
  const [category, setCategory] = useState<EventCategoryId>(initialCategory);
  const [channels, setChannels] = useState<InviteChannels>(initialTemplate.defaultChannels);

  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingFormSchema) as any,
    defaultValues: {
      organizer_name: "",
      partner_name: "",
      phone: "",
      email: "",
      event_category: initialCategory,
      event_type: initialEvent,
      event_display_name: "",
      event_date: "",
      estimated_guests: 120,
      channels: initialTemplate.defaultChannels,
      notes: "",
      referred_by_code: "",
    },
  });

  useEffect(() => {
    if (searchCategory) {
      applyTemplate(searchCategory, defaultEventTypeForCategory(searchCategory), undefined, setChannels, form.setValue);
      setCategory(searchCategory);
    }
  }, [searchCategory, form.setValue]);

  const guests = form.watch("estimated_guests");
  const eventType = form.watch("event_type") as EventTypeId;
  const displayName = form.watch("event_display_name");
  const template = resolveEventTemplate(category, eventType, displayName);
  const eventTypeOptions = eventTypesForCategory(category);

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
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <Link to="/" className="text-sm text-muted-foreground hover:underline">← חזרה לנחיתה</Link>
            <h1 className="mt-2 text-2xl font-bold">פתיחת אירוע</h1>
            <p className="text-sm text-muted-foreground">שלב {step} מתוך 3 — אפשר לנסות <Link to="/demo" className="underline">דמו מלא</Link> לפני הרשמה</p>
          </div>
          <Button variant="outline" asChild>
            <Link to="/demo">דמו המערכת</Link>
          </Button>
        </div>

        {step === 1 && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">אירוע אישי או עסקי?</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {EVENT_CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={cn(
                    "rounded-xl border-2 p-6 text-right transition hover:shadow-md",
                    category === c.id ? "border-pink-400 bg-pink-50" : "border-muted bg-card",
                  )}
                  onClick={() => {
                    setCategory(c.id);
                    const et = defaultEventTypeForCategory(c.id);
                    applyTemplate(c.id, et, undefined, setChannels, form.setValue);
                  }}
                >
                  <p className="font-semibold">{c.label}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{c.description}</p>
                </button>
              ))}
            </div>
            <Button className="w-full" onClick={() => setStep(2)}>המשך לבחירת סוג אירוע</Button>
          </section>
        )}

        {step === 2 && (
          <section className="space-y-4">
            <h2 className="text-lg font-semibold">סוג האירוע</h2>
            <p className="text-sm text-muted-foreground">הטמפלט (צבעים, טון, ערוצים) מתעדכן לפי הבחירה.</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {eventTypeOptions.map((t) => {
                const mini = resolveEventTemplate(category, t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    className={cn(
                      "rounded-lg border p-4 text-right transition",
                      eventType === t.id ? "border-pink-400 ring-2 ring-pink-200" : "border-muted",
                    )}
                    onClick={() => applyTemplate(category, t.id, displayName, setChannels, form.setValue)}
                  >
                    <span className="text-2xl">{mini.visual.icon}</span>
                    <p className="mt-1 font-medium">{t.label}</p>
                    {t.featured ? <span className="text-xs text-rose-600">מומלץ</span> : null}
                  </button>
                );
              })}
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <Label>שם האירוע (כפי שיופיע לאורחים)</Label>
                <Input
                  placeholder={template.sampleLandingTitle}
                  value={displayName ?? ""}
                  onChange={(e) => {
                    form.setValue("event_display_name", e.target.value);
                  }}
                />
              </div>
              <TemplatePreviewCard
                template={template}
                onTryDemo={() => navigate({ to: "/demo" })}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>חזרה</Button>
              <Button className="flex-1" onClick={() => setStep(3)}>המשך לפרטים ושליחה</Button>
            </div>
          </section>
        )}

        {step === 3 && (
          <>
            <PriceCalculator
              guests={guests}
              channels={channels}
              onGuestsChange={(n) => form.setValue("estimated_guests", n)}
              onChannelsChange={(c) => {
                setChannels(c);
                form.setValue("channels", c);
              }}
            />
            <TemplatePreviewCard template={template} className="max-w-md" />

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
                  <Label>תאריך משוער</Label>
                  <Input type="date" {...form.register("event_date")} dir="ltr" className="text-end" />
                </div>
                <div>
                  <Label>מספר מוזמנים משוער</Label>
                  <Input type="number" {...form.register("estimated_guests")} />
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
                  אני מבין/ה שעד 5 הזמנות בדמו, שהתמחור לפי מענה משוער (לא שליחה), ושיש מינימום התחייבות.
                </span>
              </label>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setStep(2)}>חזרה</Button>
                <Button type="submit" className="flex-1" disabled={submitting}>
                  {submitting ? "שולח..." : "שליחה וקבלת קישור לסביבת העבודה"}
                </Button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
