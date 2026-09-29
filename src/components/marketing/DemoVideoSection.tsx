import { Play } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

/** סרטון דמו — CogVideoX-3 לפי docs/DEMO_VIDEO_STORYBOARD.json */
const DEMO_VIDEO_SRC = "/demo.mp4";

export function DemoVideoSection() {
  return (
    <section className="py-10" aria-labelledby="demo-video-heading">
      <h2 id="demo-video-heading" className="text-center text-2xl font-semibold text-pink-950">
        איך זה עובד? (דמו בדקה)
      </h2>
      <p className="mx-auto mt-2 max-w-xl text-center text-sm text-muted-foreground">
        הרשמה → סביבת עבודה → הזמנות → מענה חי. צפו בסרטון או עברו לדמו אינטראקטיבי.
      </p>
      <div className="mx-auto mt-6 max-w-3xl overflow-hidden rounded-2xl border border-pink-100 bg-black/5">
        {DEMO_VIDEO_SRC ? (
          <video className="aspect-video w-full" controls poster="/demo-poster.jpg" src={DEMO_VIDEO_SRC}>
            הדפדפן שלכם לא תומך בוידאו.
          </video>
        ) : (
          <div className="flex aspect-video flex-col items-center justify-center gap-3 bg-gradient-to-br from-pink-100 to-rose-50 px-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-md">
              <Play className="h-8 w-8 text-pink-700" />
            </div>
            <p className="text-sm font-medium text-pink-950">סרטון הדמו יופיע כאן בקרוב</p>
            <p className="max-w-md text-xs text-muted-foreground">
              בינתיים: דמו מלא של המערכת — נחיתה, RSVP, אדמין ודוגמה חיה של חתונה.
            </p>
            <Button asChild>
              <Link to="/demo">פתיחת דמו המערכת</Link>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
