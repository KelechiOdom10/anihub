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

export const catalogQuerySchema = z.object({
  genres: z.string().trim().max(100).optional(),
  page: z.number().int().min(1).max(200).default(1),
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

export const malAnimeSchema = z
  .object({
    id: z.number().int().positive(),
    title: z.string(),
    main_picture: z
      .object({ medium: z.string(), large: z.string().optional() })
      .optional(),
    alternative_titles: z.object({ en: z.string().optional() }).optional(),
    synopsis: z.string().optional(),
    mean: z.number().optional(),
    num_episodes: z.number().int().optional(),
    start_season: z.object({ year: z.number().int() }).optional(),
    start_date: malDate.optional(),
    end_date: malDate.optional(),
    media_type: z.string().optional(),
    status: z.string(),
    genres: z.array(z.object({ name: z.string() })).default([]),
    studios: z.array(z.object({ name: z.string() })).default([]),
    rating: z.string().optional(),
  })
  .transform(
    (value): Anime => ({
      id: value.id,
      title: {
        english: value.alternative_titles?.en || null,
        romaji: value.title,
      },
      description: value.synopsis || null,
      coverImage: {
        extraLarge:
          value.main_picture?.large ??
          value.main_picture?.medium ??
          "/fallback-anime.avif",
      },
      averageScore: value.mean ?? null,
      episodes: value.num_episodes || null,
      seasonYear: value.start_season?.year ?? value.start_date?.year ?? null,
      startDate: value.start_date ?? unknownDate,
      endDate: value.end_date ?? unknownDate,
      format: value.media_type
        ? (mediaTypes.get(value.media_type) ?? value.media_type)
        : null,
      status: value.status,
      genres: value.genres.map((genre) => genre.name),
      studios: { nodes: value.studios },
    })
  );

export const listFields =
  "alternative_titles,mean,num_episodes,start_season,start_date,end_date,media_type,status,genres";

export const detailFields = `${listFields},synopsis,studios,rating`;
