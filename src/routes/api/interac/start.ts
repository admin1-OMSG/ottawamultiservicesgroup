import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { interacStart } from "@/features/interac/server/routes.server";

export const Route = createFileRoute("/api/interac/start")({
  server: { handlers: { POST: ({ request }) => interacStart(request) } },
});
