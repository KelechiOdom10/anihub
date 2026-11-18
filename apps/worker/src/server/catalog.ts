import { eq } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { z } from "zod";
import { cacheEntries } from "../db/schema";
import {
  animeSchema,
  catalogPageSchema,
  categoriesSchema,
  detailFields,
  homeSchema,
  isAdult,
  listFields,
  malNodeSchema,
  maxPage,
  toAnime,
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
const poolSize = 500;

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
      redirect: "manual",
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
  data: z.array(z.object({ node: malNodeSchema })),
  paging: z.object({ next: z.string().nullish() }).nullish(),
});

async function loadList(
  source: CatalogSource,
  params: Record<string, string | number>
) {
  const response = await queryMal(
    source,
    "/anime/ranking",
    params,
    listResponse
  );

  if (!response) throw new AnimeUnavailableError();

  return {
    anime: response.data
      .map((entry) => entry.node)
      .filter((node) => !isAdult(node))
      .map(toAnime),
    hasNextPage: Boolean(response.paging?.next),
  };
}

function readCache(source: CatalogSource, key: string) {
  return source.db
    .select()
    .from(cacheEntries)
    .where(eq(cacheEntries.key, key))
    .get();
}

async function writeCache<T>(source: CatalogSource, key: string, data: T) {
  const updatedAt = new Date(source.now());

  await source.db
    .insert(cacheEntries)
    .values({ key, data, updatedAt })
    .onConflictDoUpdate({ target: cacheEntries.key, set: { data, updatedAt } });
}

async function cached<T>(
  source: CatalogSource,
  key: string,
  ttl: number,
  schema: z.ZodType<T>,
  load: () => Promise<T>
): Promise<T> {
  const row = await readCache(source, key);
  const previous = schema.safeParse(row?.data);

  if (row && previous.success && source.now() - row.updatedAt.getTime() < ttl)
    return previous.data;

  try {
    const value = await load();

    await writeCache(source, key, value);

    return value;
  } catch (error) {
    if (error instanceof AnimeUnavailableError && previous.success)
      return previous.data;

    throw error;
  }
}

export function loadHome(source: CatalogSource): Promise<Home> {
  return cached(source, "mal:home", homeTtl, homeSchema, async () => {
    const fields = `${listFields},synopsis`;

    const [airing, popular] = await Promise.all([
      loadList(source, { ranking_type: "airing", limit: 12, fields }),
      loadList(source, { ranking_type: "bypopularity", limit: 12, fields }),
    ]);

    return { airing: airing.anime, popular: popular.anime };
  });
}

export async function loadAnime(
  source: CatalogSource,
  id: number
): Promise<Anime | null> {
  const key = `mal:anime:${id}`;
  const row = await readCache(source, key);
  const previous = animeSchema.safeParse(row?.data);

  if (
    row &&
    previous.success &&
    source.now() - row.updatedAt.getTime() < animeTtl
  )
    return previous.data;

  try {
    const node = await queryMal(
      source,
      `/anime/${id}`,
      { fields: detailFields },
      malNodeSchema
    );

    if (node === null || isAdult(node)) {
      if (row)
        await source.db.delete(cacheEntries).where(eq(cacheEntries.key, key));

      return null;
    }

    const anime = toAnime(node);

    await writeCache(source, key, anime);

    return anime;
  } catch (error) {
    if (error instanceof AnimeUnavailableError && previous.success)
      return previous.data;

    throw error;
  }
}

function loadPool(source: CatalogSource) {
  return cached(
    source,
    "mal:pool",
    genreTtl,
    z.array(animeSchema),
    async () =>
      (
        await loadList(source, {
          ranking_type: "bypopularity",
          limit: poolSize,
          fields: listFields,
        })
      ).anime
  );
}

const inGenre = (pool: Anime[], genre: string) =>
  pool.filter((entry) => entry.genres.includes(genre));

export async function loadCatalogPage(
  source: CatalogSource,
  genre: string | undefined,
  page: number
): Promise<CatalogPage> {
  if (genre === undefined) {
    const result = await cached(
      source,
      `mal:catalog:${page}`,
      homeTtl,
      catalogPageSchema,
      () =>
        loadList(source, {
          ranking_type: "bypopularity",
          limit: pageSize,
          offset: (page - 1) * pageSize,
          fields: listFields,
        })
    );

    return { ...result, hasNextPage: result.hasNextPage && page < maxPage };
  }

  const anime = await cached(
    source,
    `mal:genre:${genre}`,
    genreTtl,
    z.array(animeSchema),
    async () => inGenre(await loadPool(source), genre)
  );

  return {
    anime: anime.slice((page - 1) * pageSize, page * pageSize),
    hasNextPage: anime.length > page * pageSize && page < maxPage,
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
      `mal:categories:${day}`,
      genreTtl,
      categoriesSchema,
      async () => {
        const pool = await loadPool(source);

        return chooseCovers(
          pickCategories(genres, day).map((genre) => ({
            genre,
            anime: inGenre(pool, genre),
          }))
        );
      }
    );
  } catch (error) {
    if (error instanceof AnimeUnavailableError) return [];

    throw error;
  }
}
