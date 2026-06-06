import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { db } from "@/lib/db";
import { SLEEP_OPTIONS } from "@/lib/sleep-options";
import { FAQ_QUESTIONS } from "@/lib/faq-questions";
import { parseSiteSettings, type FaqItem } from "@/lib/site-settings";
import { markRsvpSubmitted } from "@/lib/rsvp-storage";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Heart, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/rsvp")({
  head: () => ({
    meta: [
      { title: "אישור הגעה — דני תומר אפטר חתונה !" },
      { name: "description", content: "אישור הגעה לחתונה של דני ותומר" },
    ],
  }),
  component: RsvpPage,
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
    sleep_option: z.string().optional(),
    blessing: z.string().trim().max(500).optional(),
    guest_question: z.string().trim().max(500).optional(),
  })
  .refine((v) => (v.full_name && v.full_name.length > 0) || (v.phone && v.phone.length > 0), {
    message: "יש להזין שם מלא או טלפון",
    path: ["full_name"],
  });

type FormValues = z.input<typeof schema>;

const PINK_GRADIENT =
  "linear-gradient(135deg, oklch(0.98 0.02 350) 0%, oklch(0.94 0.05 350) 100%)";

function RsvpPage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [faqItems, setFaqItems] = useState<FaqItem[]>(
    FAQ_QUESTIONS.map((f) => ({ question: f.question, answer: f.answer })),
  );
  const [faqOpen, setFaqOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await db.from("site_settings").select("*").eq("id", 1).maybeSingle();
      if (data) setFaqItems(parseSiteSettings(data).faq_items);
    };
    load();
  }, []);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      status: undefined as any,
      guests: 1,
      sleep_option: "",
      blessing: "",
      guest_question: "",
      full_name: "",
      phone: "",
    },
  });

  const status = form.watch("status");

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      const orParts: string[] = [];
      if (values.phone) orParts.push(`phone.eq.${values.phone}`);
      if (values.full_name) orParts.push(`full_name.eq.${values.full_name}`);
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

      const sleepLabel =
        values.status === "attending" && values.sleep_option
          ? SLEEP_OPTIONS.find((o) => o.value === values.sleep_option)?.label ?? values.sleep_option
          : null;

      const payload = {
        full_name: values.full_name || null,
        phone: values.phone || null,
        status: values.status,
        guests: values.status === "attending" ? values.guests : 1,
        sleep: sleepLabel,
        blessing: values.blessing || null,
        guest_question: values.guest_question || null,
        responded_at: new Date().toISOString(),
      };

      let id = existingId;
      if (existingId) {
        const { error } = await db.from("invitees").update(payload).eq("id", existingId);
        if (error) throw error;
      } else {
        const { data, error } = await db.from("invitees").insert(payload).select("id").single();
        if (error) throw error;
        id = data.id;
      }

      if (id) markRsvpSubmitted(id);
      toast.success("תודה! האישור נשלח ✨");
      navigate({ to: "/" });
    } catch (e: any) {
      console.error(e);
      toast.error("שגיאה בשליחה. נסו שוב.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full" style={{ background: PINK_GRADIENT }}>
      <Dialog open modal>
        <DialogContent
          className="max-w-md max-sm:border-0 max-sm:shadow-none"
          dir="rtl"
          overlayClassName="bg-[color:var(--pink-soft)]/90 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          closeTo="/"
          showBackToHome
        >
          <DialogHeader>
            <div className="flex items-center justify-center gap-2 mb-2">
              <Heart className="h-6 w-6 text-[color:var(--pink-deep)]" fill="currentColor" />
            </div>
            <DialogTitle className="text-center text-2xl">דני תומר אפטר חתונה !</DialogTitle>
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
              {form.formState.errors.full_name && (
                <p className="text-sm text-destructive">{form.formState.errors.full_name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>הגעה</Label>
              <RadioGroup
                onValueChange={(v) =>
                  form.setValue("status", v as "attending" | "not_attending", { shouldValidate: true })
                }
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
              <>
                <div className="space-y-2">
                  <Label>כמות אורחים</Label>
                  <Select defaultValue="1" onValueChange={(v) => form.setValue("guests", Number(v))}>
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

                <div className="space-y-2">
                  <Label>אפשרויות לינה</Label>
                  <Select onValueChange={(v) => form.setValue("sleep_option", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="בחרו אפשרות לינה" />
                    </SelectTrigger>
                    <SelectContent>
                      {SLEEP_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="blessing">ברכה קצרה</Label>
              <Textarea id="blessing" {...form.register("blessing")} rows={3} placeholder="מאחלים לכם..." />
            </div>

            <div className="space-y-2 border-t pt-4">
              <Label htmlFor="guest_question">יש לכם שאלה? כתבו לנו</Label>
              <Textarea
                id="guest_question"
                {...form.register("guest_question")}
                rows={2}
                placeholder="נשמח לענות על כל שאלה..."
                className="resize-none"
              />
            </div>

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "שולח..." : "שליחה"}
            </Button>
          </form>

          <div className="border-t pt-3">
            <Collapsible open={faqOpen} onOpenChange={setFaqOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full flex items-center justify-between font-medium"
                >
                  שאלות נפוצות
                  <ChevronDown className={cn("h-4 w-4 transition-transform", faqOpen && "rotate-180")} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <Accordion type="single" collapsible className="w-full">
                  {faqItems.map((item, i) => (
                    <AccordionItem key={i} value={`faq-${i}`}>
                      <AccordionTrigger className="text-sm py-3">{item.question}</AccordionTrigger>
                      <AccordionContent className="text-muted-foreground text-sm">{item.answer}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
