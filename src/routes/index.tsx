import { createFileRoute } from "@tanstack/react-router";
import workshopHtml from "@/site/workshop.html?raw";

// The home page is the original workshop document served verbatim, so every
// stylesheet, data block and script keeps its original order and runs exactly
// once per page load. Title/description/og tags live in the document's <head>.
export const Route = createFileRoute("/")({
  server: {
    handlers: {
      GET: () =>
        new Response(workshopHtml, {
          headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-cache" },
        }),
    },
  },
  component: () => null,
});
