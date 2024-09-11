import { type FragmentOf, graphql } from "gql.tada";

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
export type CharacterPreview = FragmentOf<typeof CharacterPreview>;
