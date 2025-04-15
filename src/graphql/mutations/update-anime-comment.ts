import { graphql, type VariablesOf } from "gql.tada";

export const UpdateAnimeCommentMutation = graphql(`
  mutation UpdateAnimeComment($id: Int!, $input: CommentInput!) {
    updateComment(id: $id, input: $input) {
      id
      text
      rating
      isSpoiler
    }
  }
`);

export type UpdateAnimeCommentInput = VariablesOf<
  typeof UpdateAnimeCommentMutation
>;
