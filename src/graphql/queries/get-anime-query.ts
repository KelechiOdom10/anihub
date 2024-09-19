import { type ResultOf, type VariablesOf, graphql } from "gql.tada";

import { AnimePreview } from "../fragments";

export const AnimeSearchQuery = graphql(
  `
    query Anime($id: Int!) {
      getAnime(id: $id) {
        ...AnimePreview
      }
    }
  `,
  [AnimePreview]
);
export type AnimeSearchResult = ResultOf<typeof AnimeSearchQuery>;
export type AnimeSearchQueryParams = VariablesOf<typeof AnimeSearchQuery>;
