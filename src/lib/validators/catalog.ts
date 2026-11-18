import { z } from "zod";

export const animeTypeSchema = z.enum([
  "tv",
  "movie",
  "ova",
  "special",
  "ona",
  "music",
  "cm",
  "pv",
  "tv_special",
]);

export const animeRatingSchema = z.enum(["g", "pg", "pg13", "r17", "r", "rx"]);
export const animeSortSchema = z.enum(["asc", "desc"]);

export const animeOrderSchema = z.enum([
  "mal_id",
  "start_date",
  "end_date",
  "title",
  "score",
  "episodes",
  "scored_by",
  "rank",
  "popularity",
  "favorites",
]);

export const animeStatusSchema = z.enum(["airing", "complete", "upcoming"]);

export const catalogQuerySchema = z.object({
  type: animeTypeSchema.optional().catch(undefined),
  rating: animeRatingSchema.optional().catch(undefined),
  sort: animeSortSchema.catch("asc").default("asc"),
  order_by: animeOrderSchema.catch("popularity").default("popularity"),
  status: animeStatusSchema.optional().catch(undefined),
  q: z.string().optional(),
  sfw: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true"),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  genres: z.string().optional(),
  producers: z.string().optional(),
  page: z.coerce.number().int().positive().optional().catch(undefined),
  limit: z.coerce.number().int().min(1).max(25).optional().catch(undefined),
});
