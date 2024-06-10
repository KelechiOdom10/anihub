import { type ResultOf, type VariablesOf, graphql } from "gql.tada";

import { AnimePreview } from "../fragments";

export const TopAnimeQuery = graphql(
  `
    query TopAnime($query: TopAnimeQueryParams) {
      getTopAnimes(query: $query) {
        ...AnimePreview
      }
    }
  `,
  [AnimePreview]
);

export type TopAnimeResult = ResultOf<typeof TopAnimeQuery>;
export type TopAnimeQueryParams = VariablesOf<typeof TopAnimeQuery>;
