import { type ResultOf, graphql } from "gql.tada";

import { AnimePreview } from "../fragments";

export const AnimeRelationsQuery = graphql(
  `
    query AnimeRelations($id: Int!) {
      getAnimeRelations(id: $id) {
        ...AnimePreview
      }
    }
  `,
  [AnimePreview]
);
export type AnimeRelationsQueryResult = ResultOf<typeof AnimeRelationsQuery>;
