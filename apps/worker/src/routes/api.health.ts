import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: () =>
        Response.json({
          status: "ok",
          runtime: "tanstack-start",
          adapter: "void",
        }),
      ANY: () => new Response(null, { status: 405, headers: { Allow: "GET" } }),
    },
  },
});
