import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { env } from "cloudflare:workers";
import { z } from "zod";
import { createAuth } from "~/backend/auth";
import { loadAnime, loadHome } from "./anilist.server";

export const getHome = createServerFn({ method: "GET" }).handler(() => loadHome(env));
export const getAnime = createServerFn({ method: "GET" })
  .validator(z.number().int().positive().max(2147483647))
  .handler(({ data }) => loadAnime(env, data));
export const getViewer = createServerFn({ method: "GET" }).handler(async () => {
  if (!getRequestHeaders().get("cookie")) return null;
  const session = await createAuth(env).api.getSession({ headers: getRequestHeaders() });
  return session ? { name: session.user.name, image: session.user.image } : null;
});
