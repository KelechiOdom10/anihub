import { graphql, type ResultOf } from "gql.tada";

import { CommentPreview } from "../fragments";

export const AnimeCommentsQuery = graphql(
  `
    query AnimeComments($id: Int!) {
      animeComments(animeId: $id) {
        ...CommentPreview
        replies {
          ...CommentPreview
        }
      }
    }
  `,
  [CommentPreview]
);

export type GetAnimeCommentsResult = ResultOf<typeof AnimeCommentsQuery>;
