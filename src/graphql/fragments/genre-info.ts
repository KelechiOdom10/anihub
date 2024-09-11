import { type FragmentOf, graphql } from "gql.tada";

export const GenrePreview = graphql(`
  fragment GenrePreview on Genre @_unmask {
    id
    url
    name
  }
`);
export type GenrePreview = FragmentOf<typeof GenrePreview>;
