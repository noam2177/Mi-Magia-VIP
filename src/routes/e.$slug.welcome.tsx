import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { EventWelcomePage, eventDisplayTitle } from "@/components/event/EventWelcomePage";
import { getRsvpSubmitted, migrateLegacyRsvpCookie } from "@/lib/rsvp-storage";

export const Route = createFileRoute("/e/$slug/welcome")({
  head: ({ params }) => ({
    meta: [
      { title: `ברוכים הבאים — ${eventDisplayTitle(params.slug)}` },
      { name: "description", content: "פרטי האירוע וניווט" },
    ],
  }),
  component: EventWelcomeRoute,
});

function EventWelcomeRoute() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();

  useEffect(() => {
    migrateLegacyRsvpCookie(slug);
    if (!getRsvpSubmitted(slug)) {
      navigate({ to: "/e/$slug", params: { slug } });
    }
  }, [navigate, slug]);

  if (!getRsvpSubmitted(slug)) return null;

  return <EventWelcomePage slug={slug} defaultTitle={eventDisplayTitle(slug)} />;
}
