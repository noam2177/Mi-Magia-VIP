import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { PriceCalculator } from "@/components/onboarding/PriceCalculator";
import type { InviteChannels } from "@/lib/domain/pricing";
import { BRAND, pageTitle } from "@/lib/brand";
import {
  AUDIENCE_SEGMENTS,
  CHANNEL_ESCALATION_NOTE,
  EVENT_TYPE_CARDS,
} from "@/lib/marketing-content";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: pageTitle() },
      { name: "description", content: BRAND.description },
    ],
  }),
  component: MarketingHome,
});

function MarketingHome() {
  const [guests, setGuests] = useState(120);
  const [channels, setChannels] = useState<InviteChannels>({
    whatsapp: true,
    email: true,
    phone: false,
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white" dir="rtl">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-6">
        <span className="text-lg font-semibold text-pink-900">{BRAND.name}</span>
        <div className="flex gap-2">
          <Button variant="ghost" asChild>
            <Link to="/e/$slug" params={{ slug: "daniel-tomer" }}>דמו חתונה</Link>
          </Button>
          <Button asChild>
            <Link to="/start">התחילו הרשמה</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-16">
        <section className="py-10 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-pink-950 md:text-4xl">
            מי מגיע? רשימה חיה ואחוז מענה לכל אירוע
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            לחתונות, בר/בת מצווה ואירועי משפחה. תמחור לפי <strong>מענה</strong> (לא לפי שליחה), עם מינימום התחייבות.
            נכנסים מיד, עד 5 הזמנות דמו, מקדמה בביט אחרי אישור — וכפתור משוב קטן לכל שאלה או תקלה.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button size="lg" asChild>
              <Link to="/start">פתיחת אירוע — גישה לפני תשלום</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/e/$slug" params={{ slug: "daniel-tomer" }}>לראות דמו חתונה חיה</Link>
            </Button>
          </div>
        </section>

        <section className="py-8" aria-labelledby="audience-heading">
          <h2 id="audience-heading" className="text-center text-2xl font-semibold text-pink-950">
            למי מתאים?
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-muted-foreground">
            לא למפיקי אירועים כבדים — למי שמארגן אירוע אחד (או כמה בשנה) ורוצה שליטה ברשימה ובמענה.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {AUDIENCE_SEGMENTS.map((seg) => (
              <Card key={seg.title} className="border-pink-100 bg-white/80">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-pink-900">{seg.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">{seg.description}</CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="py-8" aria-labelledby="event-types-heading">
          <h2 id="event-types-heading" className="text-center text-2xl font-semibold text-pink-950">
            סוגי אירועים
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-muted-foreground">
            בוחרים סוג בהרשמה — זה מתאים תבניות, שאלות RSVP ותמחור. אותה מערכת לכל הסוגים.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {EVENT_TYPE_CARDS.map((ev) => (
              <Card key={ev.id} className="border-pink-100">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{ev.label}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p className="text-muted-foreground">{ev.blurb}</p>
                  <p className="text-pink-900/80"><span className="font-medium">מתאים ל:</span> {ev.fit}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="mb-8 rounded-xl border border-pink-100 bg-white/90 px-4 py-4 text-center text-sm text-muted-foreground">
          {CHANNEL_ESCALATION_NOTE}
        </section>

        <section className="grid gap-8 md:grid-cols-2">
          <PriceCalculator
            guests={guests}
            channels={channels}
            onGuestsChange={setGuests}
            onChannelsChange={setChannels}
          />
          <div className="space-y-4 text-sm">
            <h2 className="text-lg font-semibold">מה מקבלים לפני התשלום</h2>
            <ul className="list-disc space-y-2 ps-5 text-muted-foreground">
              <li>סביבת עבודה לשתף עם בן/בת זוג (קישור אחד)</li>
              <li>בחירת סוג אירוע — חובה לפני שליחת הזמנות</li>
              <li>עד 5 הזמנות דמו (כל הערוצים יחד)</li>
              <li>מחשבון מחיר בזמן אמת — מסלול יוזמים ראשונים</li>
            </ul>
            <h2 className="text-lg font-semibold">מביא חבר</h2>
            <p className="text-muted-foreground">
              חבר שהירשם עם הקוד שלכם ושילם מקדמה — מזכה אתכם ב־50 ₪ מהיתרה.
            </p>
            <h2 className="text-lg font-semibold">תשלום</h2>
            <p className="text-muted-foreground">
              אחרי ההרשמה נשלח לנו מייל עם הסכום לגבייה; נחזור עם קישור ביט. אין חיוב אוטומטי.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
