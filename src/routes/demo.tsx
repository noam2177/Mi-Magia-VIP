import { createFileRoute, Link } from "@tanstack/react-router";
import { BRAND, pageTitle } from "@/lib/brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DemoVideoSection } from "@/components/marketing/DemoVideoSection";

export const Route = createFileRoute("/demo")({
  head: () => ({
    meta: [{ title: pageTitle("דמו המערכת") }],
  }),
  component: SystemDemoPage,
});

const STEPS = [
  {
    title: "1. נחיתת מוצר",
    body: "מי מגיע, מחשבון מחיר, סוגי אירועים — בלי הרשמה.",
    to: "/" as const,
    label: "לנחיתה",
  },
  {
    title: "2. דמו חתונה חיה",
    body: "חוויית אורח מלאה כמו ביום האירוע (דני ותומר).",
    to: "/e/$slug" as const,
    params: { slug: "daniel-tomer" },
    label: "לדמו חתונה",
  },
  {
    title: "3. אישור הגעה (RSVP)",
    body: "טופס אורח ומעבר לדף תודה.",
    to: "/rsvp" as const,
    label: "ל-RSVP",
  },
  {
    title: "4. הרשמה לזוג",
    body: "בחירת אישי/עסקי, סוג אירוע ותצוגת טמפלט — לפני תשלום.",
    to: "/start" as const,
    label: "להרשמה (דמו)",
  },
  {
    title: "5. אדמין (דמו)",
    body: "ניהול מוזמנים — דורש כניסה; בדמו החתונה יש כניסת מנהל.",
    to: "/admin/login" as const,
    label: "כניסת מנהל",
  },
];

function SystemDemoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white" dir="rtl">
      <header className="mx-auto flex max-w-4xl items-center justify-between px-4 py-6">
        <span className="font-semibold text-pink-900">{BRAND.name} — דמו</span>
        <Button variant="ghost" asChild>
          <Link to="/">חזרה</Link>
        </Button>
      </header>
      <main className="mx-auto max-w-4xl space-y-10 px-4 pb-16">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-pink-950">נסו את כל המערכת — בלי התחייבות</h1>
          <p className="mt-2 text-muted-foreground">
            מומלץ לכל זוג לעבור את השלבים לפני הרשמה. אין צורך בכרטיס אשראי.
          </p>
        </div>
        <DemoVideoSection />
        <div className="grid gap-4 sm:grid-cols-2">
          {STEPS.map((step) => (
            <Card key={step.title} className="border-pink-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{step.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>{step.body}</p>
                {"params" in step && step.params ? (
                  <Button size="sm" asChild>
                    <Link to={step.to} params={step.params}>{step.label}</Link>
                  </Button>
                ) : (
                  <Button size="sm" asChild>
                    <Link to={step.to}>{step.label}</Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="text-center">
          <Button size="lg" asChild>
            <Link to="/start">מוכנים? פתיחת אירוע</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
