import { eq } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { z } from "zod";
import { cacheEntries } from "../db/schema";
import {
  animeSchema,
  catalogPageSchema,
  catalogQuerySchema,
  mediaTypes,
  orders,
  seasons,
  type CatalogQuery,
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
const searchSize = 100;

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

const setSchema = z.object({ anime: z.array(animeSchema), more: z.boolean() });

const rankings = ["airing", "upcoming", "tv", "movie", "ova", "special"];

const rankingLabels = new Map([
  ["airing", "airing anime"],
  ["upcoming", "upcoming anime"],
  ["tv", "TV shows"],
  ["movie", "movies"],
  ["ova", "OVAs"],
  ["special", "specials"],
]);

const statusValues = {
  airing: "currently_airing",
  complete: "finished_airing",
  upcoming: "not_yet_aired",
};

type Query = Omit<z.output<typeof catalogQuerySchema>, "page">;

function loadMalList(
  source: CatalogSource,
  key: string,
  ttl: number,
  path: string,
  params: Record<string, string | number>
) {
  return cached(source, key, ttl, setSchema, async () => {
    const response = await queryMal(
      source,
      path,
      { ...params, fields: listFields },
      listResponse
    );

    return {
      anime: (response?.data ?? [])
        .map((entry) => entry.node)
        .filter((node) => !isAdult(node))
        .map(toAnime),
      more: Boolean(response?.paging?.next),
    };
  });
}

async function loadSource(
  source: CatalogSource,
  query: Query
): Promise<{ anime: Anime[]; note: string | null }> {
  if (query.q) {
    const q = query.q.toLowerCase().replace(/\s+/g, " ");

    const matches = await loadMalList(
      source,
      `mal:search:${q}`,
      homeTtl,
      "/anime",
      { q, limit: searchSize }
    );

    return {
      anime: matches.anime,
      note: matches.more ? "Among the top 100 title matches." : null,
    };
  }

  if (query.year) {
    const { year } = query;

    const lists = await Promise.all(
      (query.season?.length ? query.season : seasons).map((season) =>
        loadMalList(
          source,
          `mal:season:${year}:${season}`,
          genreTtl,
          `/anime/season/${year}/${season}`,
          { sort: "anime_num_list_users", limit: poolSize }
        )
      )
    );

    const anime = new Map(
      lists.flatMap((list) => list.anime).map((entry) => [entry.id, entry])
    );

    return { anime: [...anime.values()], note: null };
  }

  const ranking = [query.status, query.type].find(
    (value) => value !== undefined && rankings.includes(value)
  );

  if (ranking) {
    const ranked = await loadMalList(
      source,
      `mal:ranking:${ranking}`,
      genreTtl,
      "/anime/ranking",
      { ranking_type: ranking, limit: poolSize }
    );

    return {
      anime: ranked.anime,
      note: ranked.more
        ? `Among MyAnimeList's 500 top-ranked ${rankingLabels.get(ranking)}.`
        : null,
    };
  }

  return {
    anime: await loadPool(source),
    note: "Among MyAnimeList's 500 most popular anime.",
  };
}

const seasonOf = (month: number | null) =>
  month === null ? undefined : seasons[Math.floor((month - 1) / 3)];

const dateValue = ({ year, month, day }: Anime["startDate"]) =>
  year === null ? null : year * 10_000 + (month ?? 0) * 100 + (day ?? 0);

const sortValue: Record<
  (typeof orders)[number],
  (anime: Anime) => number | string | null
> = {
  popularity: (anime) => (anime.popularity ? -anime.popularity : null),
  score: (anime) => anime.averageScore,
  start_date: (anime) => dateValue(anime.startDate),
  title: (anime) => (anime.title.english ?? anime.title.romaji).toLowerCase(),
};

function matches(anime: Anime, query: Query, genreList: string[]) {
  const season = seasonOf(anime.startDate.month);

  return (
    (!query.type || anime.format === mediaTypes.get(query.type)) &&
    (!query.status || anime.status === statusValues[query.status]) &&
    genreList.every((genre) => anime.genres.includes(genre)) &&
    (!query.q || !query.year || anime.seasonYear === query.year) &&
    (!query.q ||
      !query.season?.length ||
      (season !== undefined && query.season.includes(season)))
  );
}

function sortAnime(anime: Anime[], query: Query) {
  const order = query.order_by ?? (query.q ? undefined : "popularity");

  if (!order) return anime;

  const value = sortValue[order];
  const direction = query.sort ?? (order === "title" ? "asc" : "desc");
  const sign = direction === "asc" ? 1 : -1;

  return anime
    .map((entry, index) => ({ entry, index, value: value(entry) }))
    .sort((a, b) => {
      if (a.value === b.value) return a.index - b.index;

      if (a.value === null) return 1;

      if (b.value === null) return -1;

      return (a.value < b.value ? -1 : 1) * sign;
    })
    .map(({ entry }) => entry);
}

async function loadPopularPage(
  source: CatalogSource,
  page: number
): Promise<CatalogPage> {
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

export type Catalog =
  | { kind: "redirect"; genre: string }
  | { kind: "unsupported"; value: string }
  | ({
      kind: "results";
      genre: string | null;
      subset: string | null;
    } & CatalogPage);

export async function loadCatalog(
  source: CatalogSource,
  input: CatalogQuery
): Promise<Catalog> {
  const { page, ...query } = catalogQuerySchema.parse(input);
  const genreList = query.genres?.split(",") ?? [];
  const legacy = query.genres && legacyGenreIds.get(query.genres);

  if (legacy) return { kind: "redirect", genre: legacy };

  if (query.genres && genreList.some((genre) => !genres.includes(genre)))
    return { kind: "unsupported", value: query.genres };

  const genre = query.genres ?? null;

  if (Object.values(query).every((value) => value === undefined))
    return {
      kind: "results",
      genre,
      subset: null,
      ...(await loadPopularPage(source, page)),
    };

  const { anime, note } = await loadSource(source, query);

  const results = sortAnime(
    anime.filter((entry) => matches(entry, query, genreList)),
    query
  );

  return {
    kind: "results",
    genre,
    subset: note,
    anime: results.slice((page - 1) * pageSize, page * pageSize),
    hasNextPage: results.length > page * pageSize && page < maxPage,
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
