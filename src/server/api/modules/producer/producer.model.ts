import { builder } from "../../builder";
import { CommonImage, Pagination, Title } from "../shared";

import { type components } from "~/server/jikan-schema";

type ProducerType = components["schemas"]["producer"];

export const Producer = builder.objectRef<ProducerType>("Producer");
type ProducerSearchResultType = components["schemas"]["producers"];

builder.objectType(Producer, {
  description: "Producer object",
  fields: (t) => ({
    id: t.exposeID("mal_id", { nullable: true }),
    url: t.exposeString("url", { nullable: true }),
    about: t.exposeString("about", { nullable: true }),
    titles: t.field({
      type: [Title],
      nullable: true,
      resolve: (parent) => parent.titles,
    }),
    image: t.field({
      type: CommonImage,
      nullable: true,
      resolve: (parent) => parent.images?.jpg,
    }),
  }),
});

export const ProducerSearchResult = builder.objectRef<ProducerSearchResultType>(
  "ProducerSearchResult"
);

builder.objectType(ProducerSearchResult, {
  description: "Producers search result object",
  fields: (t) => ({
    data: t.field({
      type: [Producer],
      description: "The list of producers",
      nullable: true,
      resolve: (parent) => parent.data,
    }),
    pagination: t.field({
      type: Pagination,
      description: "The pagination information",
      nullable: true,
      resolve: (parent) => {
        return {
          has_next_page: parent.pagination?.has_next_page,
          last_visible_page: parent.pagination?.last_visible_page,
        };
      },
    }),
  }),
});
