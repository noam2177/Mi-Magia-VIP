import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { PriceCalculator } from "@/components/onboarding/PriceCalculator";
import type { InviteChannels } from "@/lib/domain/pricing";
import { BRAND, pageTitle } from "@/lib/brand";
import {
  BUSINESS_EVENT_CARDS,
  CATEGORY_SECTIONS,
  CHANNEL_ESCALATION_NOTE,
  PERSONAL_EVENT_CARDS,
} from "@/lib/marketing-content";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DemoVideoSection } from "@/components/marketing/DemoVideoSection";
import { TemplatePreviewCard } from "@/components/onboarding/TemplatePreviewCard";
import { resolveEventTemplate } from "@/lib/domain/event-template-defaults";

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
  const weddingTemplate = resolveEventTemplate("personal", "wedding");

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white" dir="rtl">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-6">
        <span className="text-lg font-semibold text-pink-900">{BRAND.name}</span>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" asChild>
            <Link to="/demo">דמו המערכת</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/e/$slug" params={{ slug: "daniel-tomer" }}>דמו חתונה</Link>
          </Button>
          <Button asChild>
            <Link to="/start">התחילו הרשמה</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-16">
        <section className="py-8">
          <div className="grid items-center gap-8 lg:grid-cols-2">
            <div className="text-center lg:text-right">
              <h1 className="text-3xl font-bold tracking-tight text-pink-950 md:text-4xl">
                מי מגיע? רשימה חיה — דגש על חתונות
              </h1>
              <p className="mt-4 text-muted-foreground">
                אירועים אישיים (חתונה, מצווה, ברית, מסיבות רווקות) ועסקיים. טמפלט מעוצב לכל סוג — תמחור לפי מענה.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3 lg:justify-start">
                <Button size="lg" asChild>
                  <Link to="/demo">נסו דמו — בלי הרשמה</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/start" search={{ category: "personal" }}>אירוע אישי</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/start" search={{ category: "business" }}>אירוע עסקי</Link>
                </Button>
              </div>
            </div>
            <TemplatePreviewCard template={weddingTemplate} />
          </div>
        </section>

        <DemoVideoSection />

        <section className="py-8" aria-labelledby="category-heading">
          <h2 id="category-heading" className="text-center text-2xl font-semibold text-pink-950">
            אישי או עסקי?
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {CATEGORY_SECTIONS.map((seg) => (
              <Card key={seg.id} className="border-pink-100">
                <CardHeader>
                  <CardTitle>{seg.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p>{seg.description}</p>
                  <Button size="sm" variant="secondary" asChild>
                    <Link to="/start" search={{ category: seg.id }}>התחלה עם {seg.id === "personal" ? "אירוע אישי" : "אירוע עסקי"}</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="py-8" aria-labelledby="personal-events-heading">
          <h2 id="personal-events-heading" className="text-2xl font-semibold text-pink-950">
            אירועים אישיים
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PERSONAL_EVENT_CARDS.map((ev) => (
              <Card key={ev.id} className={ev.featured ? "border-rose-300 ring-1 ring-rose-200" : "border-pink-100"}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <span>{ev.icon}</span> {ev.label}
                    {ev.featured ? <span className="text-xs font-normal text-rose-600">מומלץ</span> : null}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p className="text-muted-foreground">{ev.blurb}</p>
                  <p className="text-pink-900/80"><span className="font-medium">מתאים ל:</span> {ev.fit}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="py-8" aria-labelledby="business-events-heading">
          <h2 id="business-events-heading" className="text-2xl font-semibold text-slate-900">
            אירועים עסקיים
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {BUSINESS_EVENT_CARDS.map((ev) => (
              <Card key={`biz-${ev.id}`} className="border-slate-200">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <span>{ev.icon}</span> {ev.label}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p className="text-muted-foreground">{ev.blurb}</p>
                  <p className="text-slate-800"><span className="font-medium">מתאים ל:</span> {ev.fit}</p>
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
            <h2 className="text-lg font-semibold">לפני הרשמה</h2>
            <ul className="list-disc space-y-2 ps-5 text-muted-foreground">
              <li><Link to="/demo" className="underline">דמו מלא</Link> — כל המערכת בלי תשלום</li>
              <li>עד 5 הזמנות דמו אחרי הרשמה</li>
              <li>טמפלט משתנה לפי אישי/עסקי וסוג אירוע</li>
              <li>סוג «אחר» מקבל טמפלט בסיסי וניתן להתאמה</li>
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}
