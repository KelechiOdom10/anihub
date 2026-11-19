import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { env as bindings } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import { env } from "void/env";
import { publicIdentity } from "../lib/identity";
import { animeIdSchema, catalogQuerySchema } from "./anime";
import { createAuth } from "./auth";
import {
  loadAnime,
  loadCatalog,
  loadCategories,
  loadHome,
  type CatalogSource,
} from "./catalog";

function catalog(): CatalogSource {
  return {
    db: drizzle(bindings.DB),
    fetch: (input, init) => fetch(input, init),
    now: Date.now,
    clientId: env.MAL_CLIENT_ID,
  };
}

export const getHome = createServerFn({ method: "GET" }).handler(() =>
  loadHome(catalog())
);

export const getCategories = createServerFn({ method: "GET" }).handler(() =>
  loadCategories(catalog())
);

export const getCatalog = createServerFn({ method: "GET" })
  .validator(catalogQuerySchema)
  .handler(({ data }) => loadCatalog(catalog(), data));

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

  return session
    ? {
        id: session.user.id,
        ...publicIdentity(session.user, "/anime-female-avatar.png"),
      }
    : null;
});
