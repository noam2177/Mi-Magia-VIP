import { createFileRoute, redirect } from "@tanstack/react-router";

/** Back-compat: old links pointed here after RSVP. */
export const Route = createFileRoute("/welcome")({
  beforeLoad: () => {
    throw redirect({
      to: "/e/$slug/welcome",
      params: { slug: "daniel-tomer" },
    });
  },
});
