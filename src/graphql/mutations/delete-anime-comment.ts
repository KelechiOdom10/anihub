import { graphql } from "gql.tada";

export const DeleteAnimeCommentMutation = graphql(`
  mutation DeleteAnimeComment($id: Int!) {
    deleteComment(id: $id) {
      id
    }
  }
`);
