import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { LANDING_BODY_PARAGRAPHS } from "@/lib/landing-content";
import { getEventNavigationUrl, getLandingParagraphs, parseSiteSettings, type SiteSettings } from "@/lib/site-settings";
import { getRsvpSubmitted } from "@/lib/rsvp-storage";
import { Button } from "@/components/ui/button";
import { Lock, Heart, Navigation, MapPin } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "דני תומר אפטר חתונה !" },
      { name: "description", content: "מסיבת אפטר חתונה של דני ותומר" },
    ],
  }),
  component: LandingPage,
});

const DEFAULT_SETTINGS = parseSiteSettings(null);

function LandingPage() {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [rsvpDone, setRsvpDone] = useState(false);

  useEffect(() => {
    setRsvpDone(getRsvpSubmitted());
    const load = async () => {
      const { data } = await db.from("site_settings").select("*").eq("id", 1).maybeSingle();
      setSettings(parseSiteSettings(data ?? null));
    };
    load();
    const ch = db
      .channel("settings-landing")
      .on("postgres_changes", { event: "*", schema: "public", table: "site_settings" }, load)
      .subscribe();
    return () => {
      db.removeChannel(ch);
    };
  }, []);

  const collage = settings.collage_images;
  const carousel = settings.carousel_images;
  const title = settings.landing_title;
  const bodyParagraphs = getLandingParagraphs(settings);
  const eventNavUrl = getEventNavigationUrl(settings);
  const wazeUrl = settings.waze_url;
  const googleUrl = settings.google_maps_url;

  return (
    <div className="min-h-screen relative">
      <div className="absolute inset-0 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1 opacity-40 pointer-events-none">
        {collage.length > 0
          ? collage.map((url, i) => (
              <div
                key={i}
                className="aspect-square bg-cover bg-center"
                style={{ backgroundImage: `url(${url})` }}
              />
            ))
          : null}
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-white/75 via-white/70 to-white/92" />

      <Link
        to="/admin/login"
        className="fixed top-3 left-3 z-20 opacity-40 hover:opacity-100 transition"
        aria-label="כניסת מנהל"
      >
        <Lock className="h-4 w-4" />
      </Link>

      <main className="relative z-10 mx-auto w-full max-w-3xl px-5 sm:px-8 py-12 sm:py-16 text-center">
        <header className="mb-10">
          <h1 className="text-3xl sm:text-5xl font-bold text-foreground drop-shadow-sm leading-tight">
            {title}
          </h1>

          {rsvpDone && (
            <p className="mt-4 text-base text-muted-foreground">תודה שאישרתם הגעה 💗</p>
          )}

          <Link to="/rsvp" className="inline-block mt-6">
            <Button
              size="lg"
              className="text-lg sm:text-xl px-10 sm:px-14 py-7 sm:py-8 shadow-xl hover:shadow-2xl transition-shadow bg-[color:var(--pink-deep)] hover:bg-[color:var(--pink-deep)]/90 text-white font-bold rounded-2xl"
            >
              <Heart className="ms-2 h-6 w-6" fill="currentColor" />
              {rsvpDone ? "עדכון אישור הגעה" : "אישור הגעה"}
            </Button>
          </Link>

          <div className="mt-4">
            {eventNavUrl ? (
              <a href={eventNavUrl} target="_blank" rel="noopener noreferrer">
                <Button size="lg" variant="outline" className="text-base px-8 py-5 shadow-md">
                  <MapPin className="ms-2 h-5 w-5" />
                  ניווט לאירוע
                </Button>
              </a>
            ) : (
              <Button
                size="lg"
                variant="outline"
                disabled
                className="text-base px-8 py-5 shadow-md opacity-70"
                title="קישור ניווט יוגדר בקרוב בפאנל הניהול"
              >
                <MapPin className="ms-2 h-5 w-5" />
                ניווט לאירוע
              </Button>
            )}
          </div>

          {(wazeUrl || googleUrl) && (
            <div className="mt-3 flex flex-wrap justify-center gap-3">
              {wazeUrl && (
                <a href={wazeUrl} target="_blank" rel="noopener noreferrer">
                  <Button size="lg" variant="outline" className="text-base px-6 py-5 shadow-md min-w-[9rem]">
                    <Navigation className="ms-2 h-5 w-5 text-[#33CCFF]" />
                    וויז
                  </Button>
                </a>
              )}
              {googleUrl && (
                <a href={googleUrl} target="_blank" rel="noopener noreferrer">
                  <Button size="lg" variant="outline" className="text-base px-6 py-5 shadow-md min-w-[9rem]">
                    <Navigation className="ms-2 h-5 w-5 text-[#4285F4]" />
                    גוגל מפות
                  </Button>
                </a>
              )}
            </div>
          )}
        </header>

        <section
          aria-label="פרטי האירוע"
          className="rounded-2xl border border-[color:var(--pink-deep)]/15 bg-white/85 backdrop-blur-sm shadow-sm px-5 sm:px-8 py-7 sm:py-9 text-start"
        >
          <div className="space-y-4 text-[15px] sm:text-base leading-relaxed text-foreground/90">
            {bodyParagraphs.map((paragraph, i) => (
              <p key={i} className={i === 0 ? "text-lg sm:text-xl font-semibold text-center" : undefined}>
                {paragraph}
              </p>
            ))}
          </div>
        </section>

        <section aria-label="גלריית תמונות" className="mt-12 sm:mt-16 pb-8">
          {carousel.length > 0 ? (
            <Carousel images={carousel} />
          ) : (
            <div className="rounded-2xl border border-dashed border-[color:var(--pink-deep)]/25 bg-white/50 aspect-[16/9] flex items-center justify-center text-muted-foreground text-sm">
              גלריית תמונות תופיע כאן בקרוב
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function Carousel({ images }: { images: string[] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, direction: "rtl" });

  useEffect(() => {
    if (!emblaApi) return;
    const id = setInterval(() => emblaApi.scrollNext(), 4000);
    return () => clearInterval(id);
  }, [emblaApi]);

  return (
    <div className="overflow-hidden rounded-2xl shadow-xl" ref={emblaRef}>
      <div className="flex">
        {images.map((url, i) => (
          <div key={i} className="min-w-0 flex-[0_0_100%]">
            <div className="aspect-[16/9] bg-cover bg-center" style={{ backgroundImage: `url(${url})` }} />
          </div>
        ))}
      </div>
    </div>
  );
}
