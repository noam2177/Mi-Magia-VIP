import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { getRsvpSubmitted } from "@/lib/rsvp-storage";
import { Button } from "@/components/ui/button";
import { MapPin, Lock } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";

export const Route = createFileRoute("/welcome")({
  head: () => ({
    meta: [
      { title: "ברוכים הבאים — דניאל תומר אפטר חתונה !" },
      { name: "description", content: "פרטי האירוע וניווט" },
    ],
  }),
  component: WelcomePage,
});

type Settings = {
  main_text: string;
  navigation_url: string;
  collage_images: string[];
  carousel_images: string[];
};

function WelcomePage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    if (!getRsvpSubmitted()) {
      navigate({ to: "/" });
      return;
    }
    const load = async () => {
      const { data } = await db.from("site_settings").select("*").eq("id", 1).maybeSingle();
      if (data) {
        setSettings({
          main_text: data.main_text,
          navigation_url: data.navigation_url,
          collage_images: (data.collage_images as string[]) || [],
          carousel_images: (data.carousel_images as string[]) || [],
        });
      }
    };
    load();
    const ch = db
      .channel("settings-welcome")
      .on("postgres_changes", { event: "*", schema: "public", table: "site_settings" }, load)
      .subscribe();
    return () => {
      db.removeChannel(ch);
    };
  }, [navigate]);

  const collage = settings?.collage_images ?? [];
  const carousel = settings?.carousel_images ?? [];

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Collage background */}
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
      <div className="absolute inset-0 bg-gradient-to-b from-white/70 via-white/60 to-white/90" />

      {/* Discreet admin login */}
      <Link
        to="/admin/login"
        className="absolute top-3 left-3 z-20 opacity-40 hover:opacity-100 transition"
        aria-label="כניסת מנהל"
      >
        <Lock className="h-4 w-4" />
      </Link>

      {/* Main content */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 py-16 text-center">
        <h1 className="text-4xl sm:text-6xl font-bold text-foreground drop-shadow-sm mb-6 leading-tight">
          {settings?.main_text || "דניאל ותומר מתחתנים!"}
        </h1>
        <p className="text-lg text-muted-foreground mb-8">תודה שאישרתם הגעה 💗</p>

        {settings?.navigation_url && (
          <a href={settings.navigation_url} target="_blank" rel="noopener noreferrer">
            <Button size="lg" className="text-base px-8 py-6 shadow-lg">
              <MapPin className="ms-2 h-5 w-5" />
              ניווט לאירוע
            </Button>
          </a>
        )}

        {/* Bottom carousel */}
        {carousel.length > 0 && (
          <div className="mt-16 w-full max-w-3xl">
            <Carousel images={carousel} />
          </div>
        )}
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
