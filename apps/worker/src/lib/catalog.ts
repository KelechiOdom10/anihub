import { z } from "zod";

import {
  directions,
  formats,
  orders,
  seasons,
  statuses,
  type CatalogQuery,
} from "../server/anime";

export const FORMAT_OPTIONS = [
  { value: "tv", label: "TV Show" },
  { value: "movie", label: "Movie" },
  { value: "special", label: "Special" },
  { value: "ova", label: "OVA" },
  { value: "ona", label: "ONA" },
  { value: "music", label: "Music" },
] as const;

export const STATUS_OPTIONS = [
  { value: "airing", label: "Airing" },
  { value: "complete", label: "Complete" },
  { value: "upcoming", label: "Upcoming" },
] as const;

export const SEASON_OPTIONS = [
  { value: "winter", label: "Winter" },
  { value: "spring", label: "Spring" },
  { value: "summer", label: "Summer" },
  { value: "fall", label: "Fall" },
] as const;

export const SORT_OPTIONS = [
  { value: "popularity", label: "Popularity" },
  { value: "score", label: "Score" },
  { value: "start_date", label: "Start Date" },
  { value: "title", label: "Title" },
] as const;

const text = z
  .union([z.string(), z.number()])
  .transform((value) => String(value).trim());

const list = <T extends string>(allowed: readonly T[]) =>
  text
    .transform((value) => {
      const picked = allowed.filter((option) =>
        value.split(",").includes(option)
      );

      return picked.length > 0 ? picked.join(",") : undefined;
    })
    .optional()
    .catch(undefined);

export const catalogSearchSchema = z.object({
  q: text.pipe(z.string().min(3).max(100)).optional().catch(undefined),
  year: z.coerce.number().int().min(1917).max(2100).optional().catch(undefined),
  season: list(seasons),
  type: z.enum(formats).optional().catch(undefined),
  status: z.enum(statuses).optional().catch(undefined),
  genres: text.pipe(z.string().min(1)).optional().catch(undefined),
  order_by: z.enum(orders).optional().catch(undefined),
  sort: z.enum(directions).optional().catch(undefined),
});

export type CatalogSearch = z.infer<typeof catalogSearchSchema>;

export function toCatalogQuery(search: CatalogSearch): CatalogQuery {
  return {
    ...search,
    season: search.season
      ?.split(",")
      .flatMap((value) => seasons.filter((season) => season === value)),
  };
}

export const currentYear = () => new Date().getFullYear();
