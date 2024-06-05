import { Genre } from "./genre.model";

import { builder } from "../../builder";
import { animeService } from "../anime/anime.service";

import { type operations } from "~/server/jikan-schema";

type GenresQueryParams = NonNullable<
  operations["getAnimeGenres"]["parameters"]["query"]
>;

const GenresFilterEnum = builder.enumType("GenresFilterEnum", {
  values: ["genres", "explicit_genres", "themes", "demographics"] as const,
});

export const GenresQueryParamsType = builder
  .inputRef<GenresQueryParams>("GenresQueryParams")
  .implement({
    description: "Query parameters",
    fields: (t) => ({
      filter: t.field({ type: GenresFilterEnum, required: false }),
    }),
  });

builder.queryField("getGenres", (t) =>
  t.field({
    type: [Genre],
    description: "Get the genres of anime",
    nullable: true,
    args: {
      query: t.arg({ type: GenresQueryParamsType, required: false }),
    },
    resolve: async (_, args) => {
      const { data } = await animeService.GET("/genres/anime", {
        params: { query: args.query as GenresQueryParams },
      });
      if (!data?.data) return null;

      return data.data;
    },
  })
);
