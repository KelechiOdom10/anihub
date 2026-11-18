import { createFileRoute } from "@tanstack/react-router";
import { env as bindings } from "cloudflare:workers";
import { env } from "void/env";
import { createAuth } from "../server/auth";

const handle = ({ request }: { request: Request }) =>
  createAuth(bindings.DB, env).handler(request);

export const Route = createFileRoute("/api/auth/$")({
  server: { handlers: { GET: handle, POST: handle } },
});
