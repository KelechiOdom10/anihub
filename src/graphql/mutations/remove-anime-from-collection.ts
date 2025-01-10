import { graphql, type VariablesOf } from "gql.tada";

export const RemoveAnimeFromCollectionMutation = graphql(`
  mutation RemoveAnimeFromCollection($input: RemoveAnimeFromCollectionInput!) {
    removeAnimeFromCollection(input: $input) {
      id
      name
      hasAnime
    }
  }
`);

export type RemoveAnimeFromCollectionInput = VariablesOf<
  typeof RemoveAnimeFromCollectionMutation
>["input"];
