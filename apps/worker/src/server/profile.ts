import { createServerFn } from "@tanstack/react-start";
import {
  getRequestHeaders,
  setResponseHeader,
} from "@tanstack/react-start/server";
import { env as bindings } from "cloudflare:workers";
import { env } from "void/env";
import { z } from "zod";
import { publicIdentity } from "../lib/identity";
import { createAuth } from "./auth";
import { animeSchema, type Anime } from "./anime";
import { getWatchList } from "./watch";

const tabs = [
  "watching",
  "plan_to_watch",
  "completed",
  "collections",
  "reviews",
] as const;

const sorts = ["newest", "title", "score", "name", "rating"] as const;

type Tab = (typeof tabs)[number];

type Sort = (typeof sorts)[number];

const watchPageSize = 30;
const collectionPageSize = 12;
const reviewPageSize = 10;

const query = z.strictObject({
  userId: z.string().min(1).max(100),
  tab: z.enum(tabs).default("watching"),
  page: z.number().int().min(1).max(1000).default(1),
  sort: z.enum(sorts).optional(),
});

const ownerRow = z.object({
  id: z.string(),
  name: z.string(),
  image: z.string().nullable(),
});

const collectionRow = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
});

const itemRow = z.object({
  id: z.string(),
  malId: z.number().nullable(),
  animeImage: z.string().nullable(),
  data: z.string().nullable(),
});

const reviewRow = z.object({
  id: z.string(),
  text: z.string(),
  rating: z.number(),
  isSpoiler: z.number().transform(Boolean),
  createdAt: z.number(),
  malId: z.number().nullable(),
  data: z.string().nullable(),
});

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

function cover(value: string | null | undefined) {
  if (value === "/fallback-anime.avif") return value;

  const parsed = z.url().safeParse(value);

  if (!parsed.success) return "/fallback-anime.avif";

  const url = new URL(parsed.data);

  return url.protocol === "https:" && url.hostname === "cdn.myanimelist.net"
    ? url.href
    : "/fallback-anime.avif";
}

function cached(data: string | null, animeId: number | null): Anime | null {
  if (animeId === null) return null;

  const anime = cachedAnime.safeParse(data);

  return anime.success && anime.data.id === animeId ? anime.data : null;
}

async function viewer() {
  const headers = getRequestHeaders();

  if (!headers.get("cookie")?.includes("better-auth.session_token"))
    return null;

  const session = await createAuth(bindings.DB, env).api.getSession({
    headers,
  });

  return session?.user.id ?? null;
}

type WatchItem = {
  animeId: number;
  title: string;
  image: string;
  anime: Anime | null;
};

function sortWatch(items: WatchItem[], sort: Sort) {
  if (sort === "title")
    return [...items].sort((a, b) => a.title.localeCompare(b.title));

  if (sort === "score")
    return [...items].sort(
      (a, b) => (b.anime?.averageScore ?? -1) - (a.anime?.averageScore ?? -1)
    );

  return items;
}

export const getProfile = createServerFn({ method: "GET" })
  .validator(query)
  .handler(async ({ data }) => {
    const account = await bindings.DB.prepare(
      "SELECT id, name, image FROM user WHERE id = ?"
    )
      .bind(data.userId)
      .first();

    if (!account) return null;

    const user = ownerRow.parse(account);
    const me = await viewer();
    const isSelf = me === user.id;
    const tab: Tab = data.tab;
    const sort: Sort = data.sort ?? "newest";

    const list = await getWatchList({ data: { userId: user.id } });

    const counts = {
      watching: list ? list.watching.length : 0,
      plan_to_watch: list ? list.plan_to_watch.length : 0,
      completed: list ? list.completed.length : 0,
      collections: z.number().parse(
        await bindings.DB.prepare(
          "SELECT count(*) AS n FROM collections WHERE user_id = ? AND (is_public = 1 OR ?)"
        )
          .bind(user.id, isSelf ? 1 : 0)
          .first("n")
      ),
      reviews: z
        .number()
        .parse(
          await bindings.DB.prepare(
            "SELECT count(*) AS n FROM comments WHERE user_id = ? AND parent_id IS NULL"
          )
            .bind(user.id)
            .first("n")
        ),
    };

    const bannerRow = await bindings.DB.prepare(
      `SELECT i.mal_id AS malId, i.anime_image AS animeImage, c.data
       FROM collection_items i
       JOIN collections l ON l.id = i.collection_id
       LEFT JOIN cache_entries c ON c.key = 'mal:anime:' || i.mal_id
       WHERE l.user_id = ? AND (l.is_public = 1 OR ?)
       ORDER BY i.added_at DESC, i.id DESC LIMIT 1`
    )
      .bind(user.id, isSelf ? 1 : 0)
      .first();

    const bannerParsed = z
      .object({
        malId: z.number().nullable(),
        animeImage: z.string().nullable(),
        data: z.string().nullable(),
      })
      .safeParse(bannerRow);

    const bannerAnime = bannerParsed.success
      ? cached(bannerParsed.data.data, bannerParsed.data.malId)
      : null;

    const firstWatch = list
      ? (list.watching[0] ?? list.completed[0] ?? list.plan_to_watch[0])
      : null;

    const banner = bannerAnime
      ? cover(bannerAnime.coverImage.extraLarge)
      : bannerParsed.success
        ? cover(bannerParsed.data.animeImage)
        : (firstWatch?.image ?? null);

    let watch: WatchItem[] = [];

    let collections: Array<
      z.infer<typeof collectionRow> & {
        items: Array<{ id: string; title: string; image: string }>;
      }
    > = [];

    let reviews: Array<{
      id: string;
      text: string;
      rating: number;
      isSpoiler: boolean;
      createdAt: number;
      anime: { id: number; title: string; image: string } | null;
    }> = [];

    if (tab === "watching" || tab === "plan_to_watch" || tab === "completed") {
      const items = list ? sortWatch(list[tab], sort) : [];

      watch = items.slice(
        (data.page - 1) * watchPageSize,
        data.page * watchPageSize
      );
    }

    if (tab === "collections") {
      const order =
        sort === "name"
          ? "l.name COLLATE NOCASE ASC"
          : "l.created_at DESC, l.id DESC";

      const result = await bindings.DB.prepare(
        `SELECT l.id, l.name, l.description FROM collections l
         WHERE l.user_id = ? AND (l.is_public = 1 OR ?)
         ORDER BY ${order} LIMIT 13 OFFSET ?`
      )
        .bind(user.id, isSelf ? 1 : 0, (data.page - 1) * collectionPageSize)
        .all();

      const rows = z.array(collectionRow).parse(result.results);
      const visible = rows.slice(0, collectionPageSize);

      const pages = visible.length
        ? await bindings.DB.batch(
            visible.map((row) =>
              bindings.DB.prepare(
                `SELECT i.id, i.mal_id AS malId, i.anime_image AS animeImage, c.data
                 FROM collection_items i
                 LEFT JOIN cache_entries c ON c.key = 'mal:anime:' || i.mal_id
                 WHERE i.collection_id = ?
                 ORDER BY i.added_at DESC, i.id DESC LIMIT 3`
              ).bind(row.id)
            )
          )
        : [];

      collections = visible.map((row, index) => ({
        ...row,
        items: z
          .array(itemRow)
          .parse(pages[index].results)
          .map((item) => {
            const known = cached(item.data, item.malId);

            return {
              id: item.id,
              title: known
                ? known.title.english || known.title.romaji
                : "Anime unavailable",
              image: known
                ? cover(known.coverImage.extraLarge)
                : cover(item.animeImage),
            };
          }),
      }));
    }

    if (tab === "reviews") {
      const order =
        sort === "rating"
          ? "c.rating DESC, c.created_at DESC"
          : "c.created_at DESC, c.id DESC";

      const result = await bindings.DB.prepare(
        `SELECT c.id, c.text, c.rating, c.is_spoiler AS isSpoiler, c.created_at AS createdAt,
                c.mal_id AS malId, e.data
         FROM comments c
         LEFT JOIN cache_entries e ON e.key = 'mal:anime:' || c.mal_id
         WHERE c.user_id = ? AND c.parent_id IS NULL
         ORDER BY ${order} LIMIT 11 OFFSET ?`
      )
        .bind(user.id, (data.page - 1) * reviewPageSize)
        .all();

      const rows = z.array(reviewRow).parse(result.results);

      reviews = rows.slice(0, reviewPageSize).map((row) => {
        const known = cached(row.data, row.malId);

        return {
          id: row.id,
          text: row.text,
          rating: row.rating,
          isSpoiler: row.isSpoiler,
          createdAt: row.createdAt,
          anime: known
            ? {
                id: known.id,
                title: known.title.english || known.title.romaji,
                image: cover(known.coverImage.extraLarge),
              }
            : null,
        };
      });
    }

    setResponseHeader(
      "Cache-Control",
      isSelf ? "private, no-store" : "public, max-age=60"
    );

    const length =
      tab === "collections"
        ? collections.length
        : tab === "reviews"
          ? reviews.length
          : watch.length;

    const pageLength =
      tab === "collections"
        ? collectionPageSize
        : tab === "reviews"
          ? reviewPageSize
          : watchPageSize;

    return {
      owner: {
        id: user.id,
        ...publicIdentity(user),
      },
      isSelf,
      banner,
      counts,
      tab,
      sort,
      watch,
      collections,
      reviews,
      hasNextPage: length === pageLength,
    };
  });
