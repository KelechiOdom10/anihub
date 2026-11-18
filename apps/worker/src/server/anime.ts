import { z } from "zod";

const fuzzyDate = z.object({
  year: z.number().int().nullable(),
  month: z.number().int().nullable(),
  day: z.number().int().nullable(),
});

export const animeSchema = z.object({
  id: z.number().int().positive(),
  title: z.object({ english: z.string().nullable(), romaji: z.string() }),
  description: z.string().nullable(),
  coverImage: z.object({ extraLarge: z.string() }),
  averageScore: z.number().nullable(),
  episodes: z.number().nullable(),
  seasonYear: z.number().nullable(),
  startDate: fuzzyDate,
  endDate: fuzzyDate,
  format: z.string().nullable(),
  status: z.string(),
  genres: z.array(z.string()),
  studios: z.object({ nodes: z.array(z.object({ name: z.string() })) }),
});

export type Anime = z.infer<typeof animeSchema>;

export const homeSchema = z.object({
  airing: z.array(animeSchema),
  popular: z.array(animeSchema),
});

export type Home = z.infer<typeof homeSchema>;

export const catalogPageSchema = z.object({
  anime: z.array(animeSchema),
  hasNextPage: z.boolean(),
});

export type CatalogPage = z.infer<typeof catalogPageSchema>;

export const categoriesSchema = z.array(
  z.object({ genre: z.string(), anime: z.array(animeSchema) })
);

export type Categories = z.infer<typeof categoriesSchema>;

export const maxPage = 200;

export const catalogQuerySchema = z.object({
  genres: z.string().trim().max(100).optional(),
  page: z.number().int().min(1).max(maxPage).default(1),
});

export const animeIdSchema = z.coerce.number().int().positive().max(2147483647);

const malDate = z
  .string()
  .regex(/^\d{4}(-\d{2}(-\d{2})?)?$/)
  .transform((value) => {
    const [year, month, day] = value.split("-").map(Number);

    return { year: year ?? null, month: month ?? null, day: day ?? null };
  });

const unknownDate = { year: null, month: null, day: null };

const mediaTypes = new Map([
  ["tv", "TV"],
  ["movie", "Movie"],
  ["ova", "OVA"],
  ["ona", "ONA"],
  ["special", "Special"],
  ["tv_special", "TV Special"],
  ["music", "Music"],
  ["cm", "CM"],
  ["pv", "PV"],
]);

export const malNodeSchema = z.object({
  id: z.number().int().positive(),
  title: z.string(),
  main_picture: z
    .object({ medium: z.string(), large: z.string().nullish() })
    .nullish(),
  alternative_titles: z.object({ en: z.string().nullish() }).nullish(),
  synopsis: z.string().nullish(),
  mean: z.number().nullish(),
  num_episodes: z.number().int().nullish(),
  start_season: z.object({ year: z.number().int() }).nullish(),
  start_date: malDate.nullish(),
  end_date: malDate.nullish(),
  media_type: z.string().nullish(),
  status: z.string(),
  genres: z
    .array(z.object({ name: z.string() }))
    .nullish()
    .transform((value) => value ?? []),
  studios: z
    .array(z.object({ name: z.string() }))
    .nullish()
    .transform((value) => value ?? []),
  rating: z.string().nullish(),
});

export type MalNode = z.infer<typeof malNodeSchema>;

export function isAdult(node: MalNode) {
  return node.rating === "rx";
}

export function toAnime(node: MalNode): Anime {
  return {
    id: node.id,
    title: { english: node.alternative_titles?.en || null, romaji: node.title },
    description: node.synopsis || null,
    coverImage: {
      extraLarge:
        node.main_picture?.large ??
        node.main_picture?.medium ??
        "/fallback-anime.avif",
    },
    averageScore: node.mean ?? null,
    episodes: node.num_episodes || null,
    seasonYear: node.start_season?.year ?? node.start_date?.year ?? null,
    startDate: node.start_date ?? unknownDate,
    endDate: node.end_date ?? unknownDate,
    format: node.media_type
      ? (mediaTypes.get(node.media_type) ?? node.media_type)
      : null,
    status: node.status,
    genres: node.genres.map((genre) => genre.name),
    studios: { nodes: node.studios },
  };
}

export const listFields =
  "alternative_titles,mean,num_episodes,start_season,start_date,end_date,media_type,status,genres,rating";

export const detailFields = `${listFields},synopsis,studios`;
