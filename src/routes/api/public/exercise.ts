import { createFileRoute } from "@tanstack/react-router";

// Plain JSON POST endpoint used by the "Submit my decision check" button.
export const Route = createFileRoute("/api/public/exercise")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handleSubmission } = await import("@/lib/submissions.server");
        return handleSubmission(request, "exercise");
      },
    },
  },
});
