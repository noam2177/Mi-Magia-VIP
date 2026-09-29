import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Heart } from "lucide-react";

import { db } from "@/lib/db";
import {
  type Invitee,
  rsvpFormSchema,
  type RsvpFormValues,
  buildRsvpPayload,
  isValidGuestTokenFormat,
} from "@/lib/domain";
import { eventDisplayTitle } from "@/components/event/EventWelcomePage";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { markRsvpSubmitted, getRsvpSubmitted, migrateLegacyRsvpCookie } from "@/lib/rsvp-storage";

/** Public event slug for the live daniel-tomer site (single-tenant until E2). */
const EVENT_SLUG = "daniel-tomer";

export const Route = createFileRoute("/g/$token")({
  head: () => ({
    meta: [
      { title: "אישור הגעה — קישור אישי" },
      { name: "description", content: "אישור הגעה לאירוע" },
    ],
  }),
  component: GuestPersonalRsvp,
});

function GuestPersonalRsvp() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [invitee, setInvitee] = useState<Invitee | null>(null);
  const [fatal, setFatal] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    migrateLegacyRsvpCookie(EVENT_SLUG);
    if (getRsvpSubmitted(EVENT_SLUG)) {
      navigate({ to: "/e/$slug/welcome", params: { slug: EVENT_SLUG } });
      return;
    }
    if (!isValidGuestTokenFormat(token)) {
      setFatal("הקישור לא תקין.");
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await db
        .from("invitees")
        .select("*")
        .eq("guest_token", token)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        setFatal("לא מצאנו הזמנה לקישור הזה.");
        setLoading(false);
        return;
      }
      setInvitee(data as Invitee);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate, token]);

  const form = useForm<RsvpFormValues>({
    resolver: zodResolver(rsvpFormSchema) as any,
    defaultValues: { status: undefined as any, guests: 1, sleep: false, blessing: "", full_name: "", phone: "" },
  });

  useEffect(() => {
    if (!invitee) return;
    form.reset({
      full_name: invitee.full_name ?? "",
      phone: invitee.phone ?? "",
      status: invitee.status ?? (undefined as any),
      guests: invitee.guests || 1,
      sleep: invitee.sleep,
      blessing: invitee.blessing ?? "",
    });
  }, [invitee, form]);

  const status = form.watch("status");
  const title = eventDisplayTitle(EVENT_SLUG);

  const onSubmit = async (values: RsvpFormValues) => {
    if (!invitee) return;
    setSubmitting(true);
    try {
      const payload = buildRsvpPayload(values);
      const { error } = await db.from("invitees").update(payload).eq("id", invitee.id);
      if (error) throw error;
      markRsvpSubmitted(EVENT_SLUG, invitee.id);
      toast.success("תודה! האישור נשלח ✨");
      navigate({ to: "/e/$slug/welcome", params: { slug: EVENT_SLUG } });
    } catch (e: unknown) {
      console.error(e);
      toast.error("שגיאה בשליחה. נסו שוב.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center text-muted-foreground" dir="rtl">
        טוען…
      </div>
    );
  }

  if (fatal || !invitee) {
    return (
      <div className="min-h-screen grid place-items-center p-6 text-center" dir="rtl">
        <p>{fatal ?? "שגיאה"}</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen w-full"
      style={{
        background: "linear-gradient(135deg, oklch(0.98 0.02 350) 0%, oklch(0.94 0.05 350) 100%)",
      }}
    >
      <Dialog open modal>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <div className="flex items-center justify-center gap-2 mb-2">
              <Heart className="h-6 w-6 text-[color:var(--pink-deep)]" fill="currentColor" />
            </div>
            <DialogTitle className="text-center text-2xl">{title}</DialogTitle>
            <DialogDescription className="text-center">
              {invitee.full_name ? `שלום ${invitee.full_name} — נשמח לדעת אם אתם מגיעים 💗` : "נשמח לדעת אם אתם מגיעים 💗"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">שם מלא</Label>
              <Input id="full_name" {...form.register("full_name")} placeholder="לדוגמה: דנה כהן" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">טלפון</Label>
              <Input id="phone" {...form.register("phone")} placeholder="050-0000000" />
            </div>

            <div className="space-y-2">
              <Label>הגעה</Label>
              <RadioGroup
                value={status ?? ""}
                onValueChange={(v) => form.setValue("status", v as "attending" | "not_attending", { shouldValidate: true })}
                className="flex gap-4"
                dir="rtl"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="attending" id="att" />
                  <Label htmlFor="att">מגיע</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="not_attending" id="nat" />
                  <Label htmlFor="nat">לא מגיע</Label>
                </div>
              </RadioGroup>
            </div>

            {status === "attending" && (
              <div className="space-y-2">
                <Label>כמות אורחים</Label>
                <Select
                  value={String(form.watch("guests") || 1)}
                  onValueChange={(v) => form.setValue("guests", Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Checkbox
                id="sleep"
                checked={form.watch("sleep")}
                onCheckedChange={(c) => form.setValue("sleep", Boolean(c))}
              />
              <Label htmlFor="sleep">האם מתכנן לישון באזור?</Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="blessing">ברכה קצרה</Label>
              <Textarea id="blessing" {...form.register("blessing")} rows={3} placeholder="מאחלים לכם..." />
            </div>

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "שולח..." : "שליחה"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
