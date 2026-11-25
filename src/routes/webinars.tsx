import { createFileRoute } from "@tanstack/react-router";
import webinarsHtml from "@/site/webinars.html?raw";

export const Route = createFileRoute("/webinars")({
  server: {
    handlers: {
      GET: () =>
        new Response(webinarsHtml, {
          headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-cache" },
        }),
    },
  },
  component: () => null,
});
