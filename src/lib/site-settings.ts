import { DEFAULT_BROADCAST_MESSAGE } from "@/lib/broadcast-message";
import { FAQ_QUESTIONS } from "@/lib/faq-questions";
import { LANDING_BODY_PARAGRAPHS, LANDING_TITLE } from "@/lib/landing-content";

export type FaqItem = { question: string; answer: string };

export type SiteSettings = {
  main_text: string;
  navigation_url: string;
  waze_url: string;
  google_maps_url: string;
  landing_title: string;
  landing_body: string;
  faq_items: FaqItem[];
  broadcast_message: string;
  collage_images: string[];
  carousel_images: string[];
};

export function getEventNavigationUrl(settings: SiteSettings): string {
  return settings.navigation_url || settings.waze_url || settings.google_maps_url || "";
}

export function parseSiteSettings(raw: Record<string, unknown> | null | undefined): SiteSettings {
  const faqRaw = raw?.faq_items;
  let faq_items: FaqItem[] = [];
  if (Array.isArray(faqRaw) && faqRaw.length > 0) {
    faq_items = faqRaw
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const q = (item as FaqItem).question?.trim();
        const a = (item as FaqItem).answer?.trim();
        return q && a ? { question: q, answer: a } : null;
      })
      .filter(Boolean) as FaqItem[];
  }
  if (faq_items.length === 0) {
    faq_items = FAQ_QUESTIONS.map((f) => ({ question: f.question, answer: f.answer }));
  }

  const landingBody = typeof raw?.landing_body === "string" ? raw.landing_body.trim() : "";

  return {
    main_text: typeof raw?.main_text === "string" ? raw.main_text : "",
    navigation_url: typeof raw?.navigation_url === "string" ? raw.navigation_url : "",
    waze_url: typeof raw?.waze_url === "string" ? raw.waze_url : "",
    google_maps_url: typeof raw?.google_maps_url === "string" ? raw.google_maps_url : "",
    landing_title:
      typeof raw?.landing_title === "string" && raw.landing_title.trim()
        ? raw.landing_title.trim()
        : LANDING_TITLE,
    landing_body: landingBody,
    faq_items,
    broadcast_message:
      typeof raw?.broadcast_message === "string" && raw.broadcast_message.trim()
        ? raw.broadcast_message
        : DEFAULT_BROADCAST_MESSAGE,
    collage_images: Array.isArray(raw?.collage_images) ? (raw.collage_images as string[]) : [],
    carousel_images: Array.isArray(raw?.carousel_images) ? (raw.carousel_images as string[]) : [],
  };
}

export function getLandingParagraphs(settings: SiteSettings): string[] {
  if (settings.landing_body) {
    const paragraphs = settings.landing_body
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (paragraphs.length > 0) return paragraphs;
  }
  return [...LANDING_BODY_PARAGRAPHS];
}
