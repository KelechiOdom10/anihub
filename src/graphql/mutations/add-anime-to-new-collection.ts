import { graphql, type VariablesOf } from "gql.tada";

export const AddAnimeToNewCollectionMutation = graphql(`
  mutation AddAnimeToNewCollection($input: AddAnimeToNewCollectionInput!) {
    addAnimeToNewCollection(input: $input) {
      id
      name
      description
      isPublic
      userId
      createdAt
      updatedAt
    }
  }
`);

export type AddAnimeToNewCollectionInput = VariablesOf<
  typeof AddAnimeToNewCollectionMutation
>["input"];
