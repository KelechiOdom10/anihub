import { graphql } from "gql.tada";

import { CharacterPreview } from "./../fragments";

export const TopCharactersQuery = graphql(
  `
    query TopCharacters {
      getTopCharacters {
        ...CharacterPreview
      }
    }
  `,
  [CharacterPreview]
);
