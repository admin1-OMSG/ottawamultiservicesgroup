import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { interacStatus } from "@/features/interac/server/routes.server";

export const Route = createFileRoute("/api/interac/status")({
  server: { handlers: { GET: ({ request }) => interacStatus(request) } },
});
