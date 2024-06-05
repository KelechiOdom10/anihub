import { Anime } from "./anime.model";
import { animeService } from "./anime.service";

import { builder } from "../../builder";

import { type operations } from "~/server/jikan-schema";

type TopAnimeQueryParams = NonNullable<
  operations["getTopAnime"]["parameters"]["query"]
>;
export type SearchAnimeQueryParams = NonNullable<
  operations["getAnimeSearch"]["parameters"]["query"]
>;

const AnimeTypeEnum = builder.enumType("AnimeTypeEnum", {
  values: [
    "tv",
    "movie",
    "ova",
    "special",
    "ona",
    "music",
    "cm",
    "pv",
    "tv_special",
  ] as const,
});

const FilterEnum = builder.enumType("FilterEnum", {
  values: ["airing", "bypopularity", "favorite"] as const,
});

const RatingEnum = builder.enumType("RatingEnum", {
  values: ["g", "pg", "pg13", "r17", "r", "rx"] as const,
});

const SearchSortEnum = builder.enumType("SearchSortEnum", {
  values: ["asc", "desc"] as const,
});

const AnimeOrderByEnum = builder.enumType("AnimeOrderEnum", {
  values: [
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
  ] as const,
});

export const TopAnimeQueryParamsType = builder
  .inputRef<TopAnimeQueryParams>("TopAnimeQueryParams")
  .implement({
    description: "Query parameters",
    fields: (t) => ({
      type: t.field({ type: AnimeTypeEnum, required: false }),
      rating: t.field({ type: RatingEnum, required: false }),
      filter: t.field({ type: FilterEnum, required: false }),
      sfw: t.boolean(),
      page: t.int(),
      limit: t.int(),
    }),
  });

export const SearchAnimeQueryParamsType = builder
  .inputRef<SearchAnimeQueryParams>("SearchAnimeQueryParams")
  .implement({
    description: "Query parameters",
    fields: (t) => ({
      type: t.field({ type: AnimeTypeEnum, required: false }),
      rating: t.field({ type: RatingEnum, required: false }),
      filter: t.field({ type: FilterEnum, required: false }),
      sort: t.field({ type: SearchSortEnum, required: false }),
      order_by: t.field({ type: AnimeOrderByEnum, required: false }),
      q: t.string(),
      sfw: t.boolean(),
      start_date: t.string({ description: "YYYY-MM-DD" }),
      end_date: t.string({ description: "YYYY-MM-DD" }),
      genres: t.string(),
      page: t.int(),
      limit: t.int(),
    }),
  });

builder.queryField("getTopAnimes", (t) =>
  t.field({
    type: [Anime],
    description: "Get top anime list with optional query parameters",
    args: {
      query: t.arg({ type: TopAnimeQueryParamsType, required: false }),
    },
    resolve: async (_, args) => {
      const { data } = await animeService.GET("/top/anime", {
        params: { query: args.query as TopAnimeQueryParams },
      });
      if (!data?.data) return [];

      return data.data;
    },
  })
);

builder.queryField("getAnime", (t) =>
  t.field({
    type: Anime,
    description: "Get anime by ID",
    nullable: true,
    args: {
      id: t.arg.int({ required: true }),
    },
    resolve: async (_, args) => {
      const { data } = await animeService.GET("/anime/{id}", {
        params: {
          path: { id: args.id },
        },
      });
      if (!data?.data) return null;

      return data.data;
    },
  })
);

builder.queryField("getAnimesSearch", (t) =>
  t.field({
    type: [Anime],
    description: "Search for anime",
    args: {
      query: t.arg({ type: SearchAnimeQueryParamsType, required: false }),
    },
    resolve: async (_, args) => {
      const { data } = await animeService.GET("/anime", {
        params: { query: args.query as SearchAnimeQueryParams },
      });
      if (!data?.data) return [];

      return data.data;
    },
  })
);

builder.queryField("getAnimesByGenres", (t) =>
  t.field({
    type: [Anime],
    description: "Get anime by genres",
    args: {
      genres: t.arg.string({ required: true }),
      page: t.arg.int({ required: false, defaultValue: 1 }),
      limit: t.arg.int({ required: false, defaultValue: 10 }),
    },
    resolve: async (_, args) => {
      const { data } = await animeService.GET("/anime", {
        params: {
          query: {
            genres: args.genres,
            page: args.page ?? 1,
            limit: args.limit ?? 10,
          },
        },
      });
      if (!data?.data) return [];

      return data.data;
    },
  })
);
