import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Heart } from "lucide-react";

import { db } from "@/lib/db";
import {
  rsvpFormSchema,
  type RsvpFormValues,
  buildRsvpPayload,
  buildExistingLookupOr,
  newInviteeWithToken,
} from "@/lib/domain";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { markRsvpSubmitted, getRsvpSubmitted, migrateLegacyRsvpCookie } from "@/lib/rsvp-storage";

export const Route = createFileRoute("/e/$slug/")({
  head: () => ({
    meta: [
      { title: "אישור הגעה" },
      { name: "description", content: "אישור הגעה לאירוע" },
    ],
  }),
  component: EventRsvpEntry,
});

function EventRsvpEntry() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    migrateLegacyRsvpCookie(slug);
    if (getRsvpSubmitted(slug)) {
      navigate({ to: "/e/$slug/welcome", params: { slug } });
    }
  }, [navigate, slug]);

  const form = useForm<RsvpFormValues>({
    resolver: zodResolver(rsvpFormSchema) as any,
    defaultValues: { status: undefined as any, guests: 1, sleep: false, blessing: "", full_name: "", phone: "" },
  });

  const status = form.watch("status");
  const title = slug === "daniel-tomer" ? "דניאל תומר אפטר חתונה !" : "אישור הגעה";

  const onSubmit = async (values: RsvpFormValues) => {
    setSubmitting(true);
    try {
      const orParts = buildExistingLookupOr(values);
      let existingId: string | null = null;
      if (orParts.length) {
        const { data: existing } = await db
          .from("invitees")
          .select("id")
          .or(orParts.join(","))
          .limit(1)
          .maybeSingle();
        existingId = existing?.id ?? null;
      }

      const payload = buildRsvpPayload(values);

      let id = existingId;
      if (existingId) {
        const { error } = await db.from("invitees").update(payload).eq("id", existingId);
        if (error) throw error;
      } else {
        const { data, error } = await db
          .from("invitees")
          .insert(newInviteeWithToken(payload))
          .select("id")
          .single();
        if (error) throw error;
        id = data.id;
      }

      if (id) markRsvpSubmitted(slug, id);
      toast.success("תודה! האישור נשלח ✨");
      navigate({ to: "/e/$slug/welcome", params: { slug } });
    } catch (e: any) {
      console.error(e);
      toast.error("שגיאה בשליחה. נסו שוב.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full"
      style={{
        background:
          "linear-gradient(135deg, oklch(0.98 0.02 350) 0%, oklch(0.94 0.05 350) 100%)",
      }}
    >
      <Dialog open modal>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <div className="flex items-center justify-center gap-2 mb-2">
              <Heart className="h-6 w-6 text-[color:var(--pink-deep)]" fill="currentColor" />
            </div>
            <DialogTitle className="text-center text-2xl">{title}</DialogTitle>
            <DialogDescription className="text-center">נשמח לדעת אם אתם מגיעים 💗</DialogDescription>
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
                <Select defaultValue="1" onValueChange={(v) => form.setValue("guests", Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Checkbox id="sleep" onCheckedChange={(c) => form.setValue("sleep", Boolean(c))} />
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
