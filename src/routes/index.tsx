import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { db } from "@/lib/db";
import { getEventNavigationUrl, getLandingParagraphs, parseSiteSettings, type SiteSettings } from "@/lib/site-settings";
import { getRsvpSubmitted } from "@/lib/rsvp-storage";
import { FloralTextFrame } from "@/components/floral-text-frame";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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
  const pageRef = useRef<HTMLDivElement>(null);
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [rsvpDone, setRsvpDone] = useState(false);

  useEffect(() => {
    setRsvpDone(Boolean(getRsvpSubmitted()));
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
    <div ref={pageRef} className="min-h-screen relative">
      <CollageBackground images={collage} pageRef={pageRef} />
      <div className="absolute inset-0 bg-gradient-to-b from-white/75 via-white/70 to-white/92 pointer-events-none" />

      <Link
        to="/admin/login"
        className="fixed top-3 left-3 z-20 opacity-40 hover:opacity-100 transition"
        aria-label="כניסת מנהל"
      >
        <Lock className="h-4 w-4" />
      </Link>

      <main className="relative z-10 mx-auto w-full max-w-3xl px-4 sm:px-8 py-10 sm:py-16 text-center">
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

        <FloralTextFrame>
          <section
            aria-label="פרטי האירוע"
            className="rounded-2xl border-2 border-[color:var(--pink-deep)]/20 bg-white/92 backdrop-blur-sm shadow-md px-5 sm:px-8 py-7 sm:py-9 text-start"
          >
            <div className="space-y-4 text-[15px] sm:text-base leading-relaxed text-foreground/90">
              {bodyParagraphs.map((paragraph, i) => (
                <p key={i} className={i === 0 ? "text-lg sm:text-xl font-semibold text-center" : undefined}>
                  {paragraph}
                </p>
              ))}
            </div>
          </section>
        </FloralTextFrame>

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

function useGridCols() {
  const [cols, setCols] = useState(3);
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w >= 768) setCols(5);
      else if (w >= 640) setCols(4);
      else setCols(3);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return cols;
}

function CollageBackground({
  images,
  pageRef,
}: {
  images: string[];
  pageRef: React.RefObject<HTMLDivElement | null>;
}) {
  const cols = useGridCols();
  const [pageHeight, setPageHeight] = useState(() =>
    typeof window !== "undefined" ? window.innerHeight : 800,
  );

  useEffect(() => {
    const el = pageRef.current;
    if (!el) return;
    const measure = () => {
      setPageHeight(Math.max(el.offsetHeight, window.innerHeight));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [pageRef]);

  const tileCount = useMemo(() => {
    if (images.length === 0) return 0;
    const gap = 4;
    const width = typeof window !== "undefined" ? window.innerWidth : 390;
    const cellSize = (width - gap * (cols - 1)) / cols;
    const rows = Math.ceil(pageHeight / (cellSize + gap)) + 1;
    return cols * rows;
  }, [images.length, cols, pageHeight]);

  const tiles = useMemo(() => {
    if (images.length === 0) return [];
    return Array.from({ length: tileCount }, (_, i) => ({
      url: images[i % images.length],
      key: `tile-${i}`,
    }));
  }, [images, tileCount]);

  if (tiles.length === 0) return null;

  return (
    <div
      className="absolute inset-0 overflow-hidden opacity-40 pointer-events-none"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: "4px",
        alignContent: "start",
      }}
      aria-hidden
    >
      {tiles.map((tile) => (
        <div
          key={tile.key}
          className="aspect-square w-full bg-cover bg-center"
          style={{ backgroundImage: `url(${tile.url})` }}
        />
      ))}
    </div>
  );
}

function ImageLightbox({ url, onClose }: { url: string | null; onClose: () => void }) {
  return (
    <Dialog open={!!url} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[min(95vw,56rem)] border-none bg-black/90 p-2 sm:p-4 shadow-2xl">
        {url && (
          <img
            src={url}
            alt=""
            className="mx-auto max-h-[85vh] w-full object-contain rounded-lg"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function Carousel({ images }: { images: string[] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, direction: "rtl" });
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!emblaApi) return;
    const id = setInterval(() => emblaApi.scrollNext(), 4000);
    return () => clearInterval(id);
  }, [emblaApi]);

  return (
    <>
      <div className="overflow-hidden rounded-2xl shadow-xl" ref={emblaRef}>
        <div className="flex">
          {images.map((url, i) => (
            <div key={i} className="min-w-0 flex-[0_0_100%]">
              <button
                type="button"
                className="block w-full aspect-[16/9] bg-cover bg-center cursor-pointer transition-opacity hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--pink-deep)]"
                style={{ backgroundImage: `url(${url})` }}
                onClick={() => setLightboxUrl(url)}
                aria-label={`הגדלת תמונה ${i + 1}`}
              />
            </div>
          ))}
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground text-center">לחצו על תמונה להגדלה</p>
      <ImageLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
    </>
  );
}
