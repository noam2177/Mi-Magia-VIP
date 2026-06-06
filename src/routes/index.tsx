import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { markRsvpSubmitted, getRsvpSubmitted } from "@/lib/rsvp-storage";
import { Heart } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "דניאל תומר אפטר חתונה !" },
      { name: "description", content: "אישור הגעה לחתונה של דניאל ותומר" },
    ],
  }),
  component: RsvpEntry,
});

const schema = z
  .object({
    full_name: z.string().trim().max(100).optional(),
    phone: z
      .string()
      .trim()
      .max(20)
      .regex(/^[0-9+\-\s()]*$/u, "מספר טלפון לא תקין")
      .optional(),
    status: z.enum(["attending", "not_attending"], { required_error: "יש לבחור סטטוס" }),
    guests: z.coerce.number().min(1).max(5).default(1),
    sleep: z.boolean().default(false),
    blessing: z.string().trim().max(500).optional(),
  })
  .refine((v) => (v.full_name && v.full_name.length > 0) || (v.phone && v.phone.length > 0), {
    message: "יש להזין שם מלא או טלפון",
    path: ["full_name"],
  });

type FormValues = z.input<typeof schema>;

function RsvpEntry() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (getRsvpSubmitted()) {
      navigate({ to: "/welcome" });
    }
  }, [navigate]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: { status: undefined as any, guests: 1, sleep: false, blessing: "", full_name: "", phone: "" },
  });


  const status = form.watch("status");

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      // Try find existing by phone or full_name
      const orParts: string[] = [];
      if (values.phone) orParts.push(`phone.eq.${values.phone}`);
      if (values.full_name) orParts.push(`full_name.eq.${values.full_name}`);
      let existingId: string | null = null;
      if (orParts.length) {
        const { data: existing } = await supabase
          .from("invitees")
          .select("id")
          .or(orParts.join(","))
          .limit(1)
          .maybeSingle();
        existingId = existing?.id ?? null;
      }

      const payload = {
        full_name: values.full_name || null,
        phone: values.phone || null,
        status: values.status,
        guests: values.status === "attending" ? values.guests : 1,
        sleep: values.sleep,
        blessing: values.blessing || null,
        responded_at: new Date().toISOString(),
      };

      let id = existingId;
      if (existingId) {
        const { error } = await supabase.from("invitees").update(payload).eq("id", existingId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("invitees").insert(payload).select("id").single();
        if (error) throw error;
        id = data.id;
      }

      if (id) markRsvpSubmitted(id);
      toast.success("תודה! האישור נשלח ✨");
      navigate({ to: "/welcome" });
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
            <DialogTitle className="text-center text-2xl">דניאל תומר אפטר חתונה !</DialogTitle>
            <DialogDescription className="text-center">
              נשמח לדעת אם אתם מגיעים 💗
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
              {form.formState.errors.full_name && (
                <p className="text-sm text-destructive">{form.formState.errors.full_name.message}</p>
              )}
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
              {form.formState.errors.status && (
                <p className="text-sm text-destructive">{form.formState.errors.status.message}</p>
              )}
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
