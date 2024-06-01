import { type NonUndefined } from "react-hook-form";

import { Anime } from "./anime.model";
import { animeService } from "./anime.service";

import { builder } from "../../builder";

import { type operations } from "~/server/jikan-schema";

type QueryParams = operations["getTopAnime"]["parameters"]["query"];

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

export const QueryParamsType = builder
  .inputRef<NonUndefined<QueryParams>>("QueryParams")
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

builder.queryField("getTopAnime", (t) =>
  t.field({
    type: [Anime],
    args: {
      query: t.arg({ type: QueryParamsType, required: false }),
    },
    resolve: async (_, args) => {
      const { data } = await animeService.GET("/top/anime", {
        params: { query: args.query as QueryParams },
      });
      if (!data?.data) return [];

      return data.data;
    },
  })
);

builder.queryField("getAnime", (t) =>
  t.field({
    type: Anime,
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
