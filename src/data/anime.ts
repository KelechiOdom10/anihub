import { z } from "zod";

export const animeSchema = z.object({
  id: z.number().int().positive(),
  idMal: z.number().int().positive().nullable(),
  title: z.object({ english: z.string().nullable(), romaji: z.string() }),
  description: z.string().nullable(),
  coverImage: z.object({ extraLarge: z.string().url() }),
  bannerImage: z.string().url().nullable(),
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
  featured: animeSchema.nullable(),
  trending: z.array(animeSchema),
  popular: z.array(animeSchema),
});
export type Home = z.infer<typeof homeSchema>;
export const mediaFields = `id idMal title { english romaji } description(asHtml: false)
  coverImage { extraLarge } bannerImage averageScore episodes seasonYear format status genres
  studios(isMain: true) { nodes { name } }`;

export function animeTitle(anime: Anime) {
  return anime.title.english || anime.title.romaji;
}
export function plainDescription(value: string | null) {
  return (value ?? "")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}
