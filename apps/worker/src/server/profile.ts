import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { env as bindings } from "cloudflare:workers";
import { z } from "zod";
import { animeSchema } from "./anime";

const query = z.strictObject({
  userId: z.string().min(1).max(100),
  page: z.number().int().min(1).max(1000).default(1),
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

function cover(value: string | null) {
  if (value === "/fallback-anime.avif") return value;

  const parsed = z.url().safeParse(value);

  if (!parsed.success) return "/fallback-anime.avif";

  const url = new URL(parsed.data);

  return url.protocol === "https:" && url.hostname === "cdn.myanimelist.net"
    ? url.href
    : "/fallback-anime.avif";
}

export const getProfileReviews = createServerFn({ method: "GET" })
  .validator(query)
  .handler(async ({ data }) => {
    setResponseHeader("Cache-Control", "public, max-age=60");

    const found = await bindings.DB.prepare("SELECT id FROM user WHERE id = ?")
      .bind(data.userId)
      .first();

    if (!found) return null;

    const result = await bindings.DB.prepare(
      `
      SELECT c.id, c.text, c.rating, c.is_spoiler AS isSpoiler,
             c.created_at AS createdAt, c.mal_id AS malId, e.data
      FROM comments c
      LEFT JOIN cache_entries e ON e.key = 'mal:anime:' || c.mal_id
      WHERE c.user_id = ? AND c.parent_id IS NULL
      ORDER BY c.created_at DESC, c.id DESC LIMIT 11 OFFSET ?
    `
    )
      .bind(data.userId, (data.page - 1) * 10)
      .all();

    const rows = z.array(reviewRow).parse(result.results);

    return {
      reviews: rows.slice(0, 10).map((row) => {
        const anime = cachedAnime.safeParse(row.data);

        const known =
          anime.success && anime.data.id === row.malId ? anime.data : null;

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
      }),
      hasNextPage: rows.length > 10 && data.page < 1000,
    };
  });
