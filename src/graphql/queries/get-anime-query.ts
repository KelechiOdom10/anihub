import { type ResultOf, type VariablesOf, graphql } from "gql.tada";

import { AnimePreview } from "../fragments";

export const AnimeQuery = graphql(
  `
    query Anime($id: Int!) {
      getAnime(id: $id) {
        ...AnimePreview
        type
        status
        aired {
          from
          to
        }
        episodes
        studios {
          name
        }
      }
    }
  `,
  [AnimePreview]
);
export type AnimeQueryResult = ResultOf<typeof AnimeQuery>;
export type AnimeQueryData = NonNullable<AnimeQueryResult["getAnime"]>;
export type AnimeQueryParams = VariablesOf<typeof AnimeQuery>;
