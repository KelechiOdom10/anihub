import { type FragmentOf, graphql } from "gql.tada";

export const CommentPreview = graphql(`
  fragment CommentPreview on Comment @_unmask {
    id
    text
    rating
    isSpoiler
    createdAt
    user {
      id
      username
      avatar
    }
  }
`);

export type CommentPreview = FragmentOf<typeof CommentPreview>;
