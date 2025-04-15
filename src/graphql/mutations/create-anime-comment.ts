import { graphql, type VariablesOf } from "gql.tada";

import { CommentPreview } from "../fragments";

export const CreateAnimeCommentMutation = graphql(
  `
    mutation CreateAnimeComment($input: CommentInput!) {
      createComment(input: $input) {
        ...CommentPreview
      }
    }
  `,
  [CommentPreview]
);

export type CreateAnimeCommentInput = VariablesOf<
  typeof CreateAnimeCommentMutation
>["input"];
