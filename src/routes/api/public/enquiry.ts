import { createFileRoute } from "@tanstack/react-router";

// Plain JSON POST endpoint used by the page's WORKSHOP_ENQUIRY_CONFIG.endpoint.
export const Route = createFileRoute("/api/public/enquiry")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handleSubmission } = await import("@/lib/submissions.server");
        return handleSubmission(request, "enquiry");
      },
    },
  },
});
