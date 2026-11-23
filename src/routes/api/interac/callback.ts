import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { interacCallback } from "@/features/interac/server/routes.server";

export const Route = createFileRoute("/api/interac/callback")({
  server: { handlers: { GET: ({ request }) => interacCallback(request) } },
});
