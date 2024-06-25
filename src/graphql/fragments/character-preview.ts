import { graphql } from "gql.tada";

export const CharacterPreview = graphql(`
  fragment CharacterPreview on Character @_unmask {
    id
    name
    nicknames
    about
    image {
      small
      default
    }
  }
`);
