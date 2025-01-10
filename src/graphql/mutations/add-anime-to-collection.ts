import { graphql, type VariablesOf } from "gql.tada";

export const AddAnimeToCollectionMutation = graphql(`
  mutation AddAnimeToCollection($input: AddAnimeToCollectionInput!) {
    addAnimeToCollection(input: $input) {
      id
      animeId
      collectionId
    }
  }
`);

export type AddAnimeToCollectionInput = VariablesOf<
  typeof AddAnimeToCollectionMutation
>["input"];
