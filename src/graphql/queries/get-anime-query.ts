import { type ResultOf, type VariablesOf, graphql } from "gql.tada";

import { AnimePreview } from "../fragments";

export const AnimeQuery = graphql(
  `
    query Anime($id: Int!) {
      getAnime(id: $id) {
        ...AnimePreview
      }
    }
  `,
  [AnimePreview]
);
export type AnimeQueryResult = ResultOf<typeof AnimeQuery>;
export type AnimeQueryParams = VariablesOf<typeof AnimeQuery>;
