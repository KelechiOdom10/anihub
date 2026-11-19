import { createServerFn } from "@tanstack/react-start";
import {
  getRequestHeaders,
  setResponseHeader,
} from "@tanstack/react-start/server";
import { env as bindings } from "cloudflare:workers";
import { env } from "void/env";
import { z } from "zod";
import { animeSchema } from "./anime";
import { createAuth } from "./auth";

const watchStatuses = ["watching", "plan_to_watch", "completed"] as const;

export type WatchStatus = (typeof watchStatuses)[number];

const animeIdSchema = z.number().int().positive().max(2147483647);
const statusSchema = z.enum(watchStatuses);

const cachedAnime = z
  .string()
  .transform((value) => {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  })
  .pipe(animeSchema);

const listRow = z.object({
  malId: z.number(),
  status: statusSchema,
  animeImage: z.string().nullable(),
  data: z.string().nullable(),
});

async function owner() {
  setResponseHeader("Cache-Control", "private, no-store");
  setResponseHeader("Vary", "Cookie");

  const session = await createAuth(bindings.DB, env).api.getSession({
    headers: getRequestHeaders(),
  });

  return session?.user.id ?? null;
}

function rejectedRequest() {
  const headers = getRequestHeaders();

  return (
    headers.get("origin") !== new URL(env.BETTER_AUTH_URL).origin ||
    !headers.get("content-type")?.startsWith("application/json")
  );
}

function cover(value: string | null | undefined) {
  const parsed = z.url().safeParse(value);

  if (!parsed.success) return "/fallback-anime.avif";

  const url = new URL(parsed.data);

  return url.protocol === "https:" && url.hostname === "cdn.myanimelist.net"
    ? url.href
    : "/fallback-anime.avif";
}

function cached(data: string | null, animeId: number) {
  const anime = cachedAnime.safeParse(data);

  return anime.success && anime.data.id === animeId ? anime.data : null;
}

export const getWatchStatus = createServerFn({ method: "GET" })
  .validator(z.strictObject({ animeId: animeIdSchema }))
  .handler(async ({ data }) => {
    const userId = await owner();

    if (!userId) return null;

    const status = await bindings.DB.prepare(
      "SELECT status FROM watch_statuses WHERE user_id = ? AND mal_id = ?"
    )
      .bind(userId, data.animeId)
      .first("status");

    return { status: statusSchema.nullable().parse(status ?? null) };
  });

export const setWatchStatus = createServerFn({ method: "POST" })
  .validator(
    z.strictObject({ animeId: animeIdSchema, status: statusSchema.nullable() })
  )
  .handler(async ({ data }) => {
    const userId = await owner();

    if (rejectedRequest())
      return { kind: "error", message: "Request not allowed" } as const;

    if (!userId)
      return { kind: "signed-out", message: "Sign in again" } as const;

    try {
      if (!data.status) {
        await bindings.DB.prepare(
          "DELETE FROM watch_statuses WHERE user_id = ? AND mal_id = ?"
        )
          .bind(userId, data.animeId)
          .run();

        return { kind: "saved", status: null } as const;
      }

      const anime = cached(
        await bindings.DB.prepare(
          "SELECT data FROM cache_entries WHERE key = ?"
        )
          .bind(`mal:anime:${data.animeId}`)
          .first("data"),
        data.animeId
      );

      if (!anime)
        return { kind: "error", message: "Anime unavailable" } as const;

      const now = Date.now();

      await bindings.DB.prepare(
        `
        INSERT INTO watch_statuses (id, user_id, mal_id, status, anime_image, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (user_id, mal_id) DO UPDATE SET
          status = excluded.status,
          anime_image = excluded.anime_image,
          updated_at = excluded.updated_at
      `
      )
        .bind(
          crypto.randomUUID(),
          userId,
          data.animeId,
          data.status,
          cover(anime.coverImage.extraLarge),
          now,
          now
        )
        .run();

      return { kind: "saved", status: data.status } as const;
    } catch {
      return { kind: "error", message: "Couldn't save status" } as const;
    }
  });

export const getWatchList = createServerFn({ method: "GET" }).handler(
  async () => {
    const userId = await owner();

    if (!userId) return null;

    const result = await bindings.DB.prepare(
      `
      SELECT w.mal_id AS malId, w.status, w.anime_image AS animeImage, c.data
      FROM watch_statuses w
      LEFT JOIN cache_entries c ON c.key = 'mal:anime:' || w.mal_id
      WHERE w.user_id = ?
      ORDER BY w.updated_at DESC, w.id DESC LIMIT 500
    `
    )
      .bind(userId)
      .all();

    const items = z
      .array(listRow)
      .parse(result.results)
      .map((row) => {
        const anime = cached(row.data, row.malId);

        return {
          animeId: row.malId,
          status: row.status,
          title: anime
            ? anime.title.english || anime.title.romaji
            : "Anime unavailable",
          image: cover(anime?.coverImage.extraLarge ?? row.animeImage),
        };
      });

    return {
      watching: items.filter((item) => item.status === "watching"),
      plan_to_watch: items.filter((item) => item.status === "plan_to_watch"),
      completed: items.filter((item) => item.status === "completed"),
    };
  }
);
