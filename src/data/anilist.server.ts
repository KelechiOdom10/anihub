import { eq } from "drizzle-orm";
import { z } from "zod";
import { createDb, animeCache, cacheEntries } from "~/backend/db";
import type { Env } from "~/env";
import { animeSchema, homeSchema, mediaFields, type Anime } from "./anime";

export class AnimeUnavailableError extends Error {
  constructor() {
    super("AniList is taking a break. Please try again shortly.");
  }
}
class AnimeNotFoundError extends Error {}
async function queryAniList(query: string, variables: Record<string, unknown> = {}) {
  const response = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(8000),
  });
  if (response.status === 404) throw new AnimeNotFoundError();
  if (!response.ok) throw new AnimeUnavailableError();
  return response.json();
}
export async function loadHome(env: Pick<Env, "DB">) {
  const db = createDb(env);
  const cached = await db.select().from(cacheEntries).where(eq(cacheEntries.key, "home")).get();
  const parsed = homeSchema.safeParse(cached?.data);
  if (parsed.success && cached && Date.now() - cached.updatedAt.getTime() < 3600000)
    return parsed.data;
  try {
    const result = z
      .object({
        data: z.object({
          featured: animeSchema.nullable(),
          trending: z.object({ media: z.array(animeSchema) }),
          popular: z.object({ media: z.array(animeSchema) }),
        }),
      })
      .parse(
        await queryAniList(`{
      featured: Media(id: 127230, type: ANIME) { ${mediaFields} }
      trending: Page(perPage: 6) { media(type: ANIME, sort: TRENDING_DESC, isAdult: false) { ${mediaFields} } }
      popular: Page(perPage: 6) { media(type: ANIME, sort: POPULARITY_DESC, isAdult: false) { ${mediaFields} } }
    }`),
      );
    const data = {
      featured: result.data.featured,
      trending: result.data.trending.media,
      popular: result.data.popular.media,
    };
    await db
      .insert(cacheEntries)
      .values({ key: "home", data, updatedAt: new Date() })
      .onConflictDoUpdate({ target: cacheEntries.key, set: { data, updatedAt: new Date() } });
    return data;
  } catch (error) {
    if (parsed.success) return parsed.data;
    if (
      error instanceof TypeError ||
      error instanceof z.ZodError ||
      error instanceof AnimeUnavailableError ||
      (error instanceof DOMException && error.name === "TimeoutError")
    )
      throw new AnimeUnavailableError();
    throw error;
  }
}
export async function loadAnime(env: Pick<Env, "DB">, id: number): Promise<Anime | null> {
  const db = createDb(env);
  const cached = await db.select().from(animeCache).where(eq(animeCache.id, id)).get();
  const parsed = animeSchema.safeParse(cached?.data);
  if (parsed.success && cached && Date.now() - cached.updatedAt.getTime() < 86400000)
    return parsed.data;
  try {
    const result = z
      .object({ data: z.object({ Media: animeSchema.nullable() }) })
      .parse(
        await queryAniList(
          `query ($id: Int!) { Media(id: $id, type: ANIME, isAdult: false) { ${mediaFields} } }`,
          { id },
        ),
      );
    const data = result.data.Media;
    if (!data) return null;
    await db
      .insert(animeCache)
      .values({ id, malId: data.idMal, data, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: animeCache.id,
        set: { data, malId: data.idMal, updatedAt: new Date() },
      });
    return data;
  } catch (error) {
    if (error instanceof AnimeNotFoundError) return null;
    if (parsed.success) return parsed.data;
    if (
      error instanceof TypeError ||
      error instanceof z.ZodError ||
      error instanceof AnimeUnavailableError ||
      (error instanceof DOMException && error.name === "TimeoutError")
    )
      throw new AnimeUnavailableError();
    throw error;
  }
}
