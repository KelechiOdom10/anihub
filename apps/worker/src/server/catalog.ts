import { eq } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { z } from "zod";
import { animeCache, cacheEntries } from "../db/schema";
import {
  animeSchema,
  homeSchema,
  mediaFields,
  type Anime,
  type Home,
} from "./anime";

const homeTtl = 3_600_000;
const animeTtl = 86_400_000;

export type CatalogSource = {
  db: DrizzleD1Database;
  fetch: typeof fetch;
  now: () => number;
};

export class AnimeUnavailableError extends Error {
  constructor() {
    super("Anime data is unavailable right now. Please try again shortly.");
  }
}

async function queryAniList<T>(
  source: CatalogSource,
  query: string,
  variables: Record<string, number>,
  schema: z.ZodType<T>
): Promise<T | null> {
  const response = await source
    .fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ query, variables }),
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

const homeResponse = z.object({
  data: z.object({
    trending: z.object({ media: z.array(animeSchema) }),
    popular: z.object({ media: z.array(animeSchema) }),
  }),
});

const animeResponse = z.object({
  data: z.object({ Media: animeSchema.nullable() }),
});

export async function loadHome(source: CatalogSource): Promise<Home> {
  const cached = await source.db
    .select()
    .from(cacheEntries)
    .where(eq(cacheEntries.key, "home"))
    .get();

  const previous = homeSchema.safeParse(cached?.data);

  if (
    cached &&
    previous.success &&
    source.now() - cached.updatedAt.getTime() < homeTtl
  )
    return previous.data;

  try {
    const response = await queryAniList(
      source,
      `{
        trending: Page(perPage: 12) { media(type: ANIME, sort: TRENDING_DESC, isAdult: false) { ${mediaFields} } }
        popular: Page(perPage: 12) { media(type: ANIME, sort: POPULARITY_DESC, isAdult: false) { ${mediaFields} } }
      }`,
      {},
      homeResponse
    );

    if (!response) throw new AnimeUnavailableError();

    const home = {
      trending: response.data.trending.media,
      popular: response.data.popular.media,
    };

    const updatedAt = new Date(source.now());

    await source.db
      .insert(cacheEntries)
      .values({ key: "home", data: home, updatedAt })
      .onConflictDoUpdate({
        target: cacheEntries.key,
        set: { data: home, updatedAt },
      });

    return home;
  } catch (error) {
    if (error instanceof AnimeUnavailableError && previous.success)
      return previous.data;

    throw error;
  }
}

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
    const response = await queryAniList(
      source,
      `query ($id: Int!) { Media(id: $id, type: ANIME, isAdult: false) { ${mediaFields} } }`,
      { id },
      animeResponse
    );

    const anime = response?.data.Media ?? null;

    if (!anime) return null;

    const updatedAt = new Date(source.now());

    await source.db
      .insert(animeCache)
      .values({ id, malId: anime.idMal, data: anime, updatedAt })
      .onConflictDoUpdate({
        target: animeCache.id,
        set: { malId: anime.idMal, data: anime, updatedAt },
      });

    return anime;
  } catch (error) {
    if (error instanceof AnimeUnavailableError && previous.success)
      return previous.data;

    throw error;
  }
}
