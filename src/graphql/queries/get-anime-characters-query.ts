import { type ResultOf, graphql } from "gql.tada";

import { CharacterPreview } from "../fragments";

export const AnimeCharactersQuery = graphql(
  `
    query AnimeCharacters($id: Int!) {
      getAnimeCharacters(id: $id) {
        character {
          ...CharacterPreview
        }
        role
        voiceActors {
          language
          person {
            id
            name
            image
          }
        }
      }
    }
  `,
  [CharacterPreview]
);
export type AnimeCharactersQueryResult = ResultOf<typeof AnimeCharactersQuery>;
