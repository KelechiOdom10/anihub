import { graphql } from "gql.tada";

export const GenrePreview = graphql(`
  fragment GenrePreview on Genre @_unmask {
    id
    url
    name
  }
`);
