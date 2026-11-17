import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { env as bindings } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import { env } from "void/env";
import { animeIdSchema } from "./anime";
import { createAuth } from "./auth";
import { loadAnime, loadHome, type CatalogSource } from "./catalog";

function catalog(): CatalogSource {
  return {
    db: drizzle(bindings.DB),
    fetch: (input, init) => fetch(input, init),
    now: Date.now,
  };
}

export const getHome = createServerFn({ method: "GET" }).handler(() =>
  loadHome(catalog())
);

export const getAnime = createServerFn({ method: "GET" })
  .validator(animeIdSchema)
  .handler(({ data }) => loadAnime(catalog(), data));

export const getViewer = createServerFn({ method: "GET" }).handler(async () => {
  const headers = getRequestHeaders();

  if (!headers.get("cookie")?.includes("better-auth.session_token"))
    return null;

  const session = await createAuth(bindings.DB, env).api.getSession({
    headers,
  });

  return session ? { name: session.user.name } : null;
});
