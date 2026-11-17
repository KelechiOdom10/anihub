import { z } from "zod";

export const animeSchema = z.object({
  id: z.number().int().positive(),
  idMal: z.number().int().positive().nullable(),
  title: z.object({ english: z.string().nullable(), romaji: z.string() }),
  description: z.string().nullable(),
  coverImage: z.object({ extraLarge: z.url() }),
  bannerImage: z.url().nullable(),
  averageScore: z.number().nullable(),
  episodes: z.number().nullable(),
  seasonYear: z.number().nullable(),
  format: z.string().nullable(),
  status: z.string(),
  genres: z.array(z.string()),
  studios: z.object({ nodes: z.array(z.object({ name: z.string() })) }),
});

export type Anime = z.infer<typeof animeSchema>;

export const homeSchema = z.object({
  trending: z.array(animeSchema),
  popular: z.array(animeSchema),
});

export type Home = z.infer<typeof homeSchema>;

export const animeIdSchema = z.coerce.number().int().positive().max(2147483647);

export const mediaFields = `id idMal title { english romaji } description(asHtml: false)
  coverImage { extraLarge } bannerImage averageScore episodes seasonYear format status genres
  studios(isMain: true) { nodes { name } }`;
