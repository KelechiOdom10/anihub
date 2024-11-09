import { AnimeCharacter, Character } from "./character.model";

import { builder } from "../../builder";
import { animeService } from "../anime/anime.service";

import { type operations } from "~/server/jikan-schema";

type QueryParams = NonNullable<
  operations["getTopCharacters"]["parameters"]["query"]
>;
const QueryParamsType = builder
  .inputRef<QueryParams>("CharacterQueryParams")
  .implement({
    description: "Character Query parameters",
    fields: (t) => ({
      page: t.int(),
      limit: t.int(),
    }),
  });

builder.queryField("getTopCharacters", (t) =>
  t.field({
    type: [Character],
    args: {
      query: t.arg({ type: QueryParamsType, required: false }),
    },
    resolve: async (_, args) => {
      const { data } = await animeService.GET("/top/characters", {
        params: { query: args.query as QueryParams },
      });
      if (!data?.data) return [];

      return data.data;
    },
  })
);

builder.queryField("getAnimeCharacters", (t) =>
  t.field({
    type: [AnimeCharacter],
    description: "Get anime characters",
    args: {
      id: t.arg.int({ required: true }),
    },
    resolve: async (_, { id }) => {
      const { data } = await animeService.GET("/anime/{id}/characters", {
        params: {
          path: { id },
        },
      });
      if (!data?.data) return [];

      return data.data;
    },
  })
);
