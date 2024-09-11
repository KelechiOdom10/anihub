import { type ResultOf, type VariablesOf, graphql } from "gql.tada";

import { AnimePreview } from "../fragments";

export const AnimeSearchQuery = graphql(
  `
    query AnimeSearch($query: SearchAnimeQueryParams) {
      getAnimesSearch(query: $query) {
        data {
          ...AnimePreview
        }
        pagination {
          hasNextPage
          lastVisiblePage
          items {
            count
            total
            perPage
          }
        }
      }
    }
  `,
  [AnimePreview]
);
export type AnimeSearchResult = ResultOf<typeof AnimeSearchQuery>;
export type AnimeSearchQueryParams = VariablesOf<typeof AnimeSearchQuery>;
