import { eq } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { z } from "zod";
import { animeCache, cacheEntries } from "../db/schema";
import {
  animeSchema,
  catalogPageSchema,
  categoriesSchema,
  detailFields,
  homeSchema,
  listFields,
  malAnimeSchema,
  type Anime,
  type CatalogPage,
  type Categories,
  type Home,
} from "./anime";
import { chooseCovers, genres, legacyGenreIds, pickCategories } from "./genres";

const homeTtl = 3_600_000;
const animeTtl = 86_400_000;
const genreTtl = 86_400_000;
const pageSize = 25;
const genrePoolSize = 500;

export type CatalogSource = {
  db: DrizzleD1Database;
  fetch: typeof fetch;
  now: () => number;
  clientId: string;
};

export class AnimeUnavailableError extends Error {
  constructor() {
    super("Anime data is unavailable right now. Please try again shortly.");
  }
}

async function queryMal<T>(
  source: CatalogSource,
  path: string,
  params: Record<string, string | number>,
  schema: z.ZodType<T>
): Promise<T | null> {
  const url = new URL(`https://api.myanimelist.net/v2${path}`);

  for (const [key, value] of Object.entries(params))
    url.searchParams.set(key, String(value));

  const response = await source
    .fetch(url, {
      headers: { "X-MAL-CLIENT-ID": source.clientId },
      signal: AbortSignal.timeout(8000),
    })
    .catch(() => {
      throw new AnimeUnavailableError();
    });

  if (response.status === 404) return null;

  if (!response.ok) throw new AnimeUnavailableError();

  const parsed = schema.safeParse(await response.json().catch(() => null));

  if (!parsed.success) throw new AnimeUnavailableError();

  return parsed.data;
}

const listResponse = z.object({
  data: z.array(z.object({ node: malAnimeSchema })),
  paging: z.object({ next: z.string().optional() }).default({}),
});

async function loadList(
  source: CatalogSource,
  path: string,
  params: Record<string, string | number>
) {
  const response = await queryMal(source, path, params, listResponse);

  if (!response) throw new AnimeUnavailableError();

  return {
    anime: response.data.map((entry) => entry.node),
    hasNextPage: response.paging.next !== undefined,
  };
}

async function cached<T>(
  source: CatalogSource,
  key: string,
  ttl: number,
  schema: z.ZodType<T>,
  load: () => Promise<T>
): Promise<T> {
  const row = await source.db
    .select()
    .from(cacheEntries)
    .where(eq(cacheEntries.key, key))
    .get();

  const previous = schema.safeParse(row?.data);

  if (row && previous.success && source.now() - row.updatedAt.getTime() < ttl)
    return previous.data;

  try {
    const value = await load();
    const updatedAt = new Date(source.now());

    await source.db
      .insert(cacheEntries)
      .values({ key, data: value, updatedAt })
      .onConflictDoUpdate({
        target: cacheEntries.key,
        set: { data: value, updatedAt },
      });

    return value;
  } catch (error) {
    if (error instanceof AnimeUnavailableError && previous.success)
      return previous.data;

    throw error;
  }
}

export function loadHome(source: CatalogSource): Promise<Home> {
  return cached(source, "home", homeTtl, homeSchema, async () => {
    const fields = `${listFields},synopsis`;

    const [airing, popular] = await Promise.all([
      loadList(source, "/anime/ranking", {
        ranking_type: "airing",
        limit: 12,
        fields,
      }),
      loadList(source, "/anime/ranking", {
        ranking_type: "bypopularity",
        limit: 12,
        fields,
      }),
    ]);

    return { airing: airing.anime, popular: popular.anime };
  });
}

const adultRating = z.object({ rating: z.literal("rx") });

export async function loadAnime(
  source: CatalogSource,
  id: number
): Promise<Anime | null> {
  const cached = await source.db
    .select()
    .from(animeCache)
    .where(eq(animeCache.id, id))
    .get();

  const previous = animeSchema.safeParse(cached?.data);

  if (
    cached &&
    previous.success &&
    source.now() - cached.updatedAt.getTime() < animeTtl
  )
    return previous.data;

  try {
    const response = await queryMal(
      source,
      `/anime/${id}`,
      { fields: detailFields },
      z.unknown()
    );

    if (response === null || adultRating.safeParse(response).success)
      return null;

    const parsed = malAnimeSchema.safeParse(response);

    if (!parsed.success) throw new AnimeUnavailableError();

    const anime = parsed.data;
    const updatedAt = new Date(source.now());

    await source.db
      .insert(animeCache)
      .values({ id, malId: id, data: anime, updatedAt })
      .onConflictDoUpdate({
        target: animeCache.id,
        set: { data: anime, updatedAt },
      });

    return anime;
  } catch (error) {
    if (error instanceof AnimeUnavailableError && previous.success)
      return previous.data;

    throw error;
  }
}

function loadGenre(source: CatalogSource, genre: string) {
  return cached(
    source,
    `genre:${genre}`,
    genreTtl,
    z.array(animeSchema),
    async () => {
      const pool = await cached(
        source,
        "genre-pool",
        genreTtl,
        z.array(animeSchema),
        async () =>
          (
            await loadList(source, "/anime/ranking", {
              ranking_type: "bypopularity",
              limit: genrePoolSize,
              fields: listFields,
            })
          ).anime
      );

      return pool.filter((entry) => entry.genres.includes(genre));
    }
  );
}

export async function loadCatalogPage(
  source: CatalogSource,
  genre: string | undefined,
  page: number
): Promise<CatalogPage> {
  if (genre === undefined)
    return cached(
      source,
      `catalog:all:${page}`,
      homeTtl,
      catalogPageSchema,
      () =>
        loadList(source, "/anime/ranking", {
          ranking_type: "bypopularity",
          limit: pageSize,
          offset: (page - 1) * pageSize,
          fields: listFields,
        })
    );

  const anime = await loadGenre(source, genre);

  return {
    anime: anime.slice((page - 1) * pageSize, page * pageSize),
    hasNextPage: anime.length > page * pageSize,
  };
}

export type Catalog =
  | { kind: "redirect"; genre: string }
  | { kind: "unsupported"; value: string }
  | ({ kind: "results"; genre: string | null } & CatalogPage);

export async function loadCatalog(
  source: CatalogSource,
  query: { genres?: string; page: number }
): Promise<Catalog> {
  if (!query.genres)
    return {
      kind: "results",
      genre: null,
      ...(await loadCatalogPage(source, undefined, query.page)),
    };

  const legacy = legacyGenreIds.get(query.genres);

  if (legacy) return { kind: "redirect", genre: legacy };

  if (!genres.includes(query.genres))
    return { kind: "unsupported", value: query.genres };

  return {
    kind: "results",
    genre: query.genres,
    ...(await loadCatalogPage(source, query.genres, query.page)),
  };
}

export async function loadCategories(
  source: CatalogSource
): Promise<Categories> {
  const day = new Date(source.now()).toISOString().slice(0, 10);

  try {
    return await cached(
      source,
      `categories:${day}`,
      genreTtl,
      categoriesSchema,
      async () => {
        const picked = pickCategories(genres, day);
        const pages = [];

        for (const genre of picked)
          pages.push({ genre, anime: await loadGenre(source, genre) });

        return chooseCovers(pages);
      }
    );
  } catch (error) {
    if (error instanceof AnimeUnavailableError) return [];

    throw error;
  }
}
