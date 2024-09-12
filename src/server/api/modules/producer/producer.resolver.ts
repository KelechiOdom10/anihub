import { ProducerSearchResult } from "./producer.model";

import { builder } from "../../builder";
import { animeService } from "../anime/anime.service";
import { SearchSortEnum } from "../shared";

import { type operations } from "~/server/jikan-schema";

export type ProducerSearchQueryParamsType = NonNullable<
  operations["getProducers"]["parameters"]["query"]
>;

const ProducerOrderByEnum = builder.enumType("ProducerOrderEnum", {
  values: ["mal_id", "count", "favorites", "established"] as const,
});

export const ProducerSearchQueryParams = builder
  .inputRef<ProducerSearchQueryParamsType>("ProducerSearchQueryParams")
  .implement({
    description: "Producer Search Query parameters",
    fields: (t) => ({
      page: t.int(),
      limit: t.int(),
      q: t.string(),
      order_by: t.field({ type: ProducerOrderByEnum, required: false }),
      sort: t.field({ type: SearchSortEnum, required: false }),
      letter: t.string(),
    }),
  });

builder.queryField("getProducers", (t) =>
  t.field({
    type: ProducerSearchResult,
    description: "Search for anime",
    args: {
      query: t.arg({ type: ProducerSearchQueryParams, required: false }),
    },
    resolve: async (_, args) => {
      const { data } = await animeService.GET("/producers", {
        params: { query: args.query as ProducerSearchQueryParamsType },
      });
      return {
        data: data?.data ?? [],
        pagination: data?.pagination ?? undefined,
      };
    },
  })
);
