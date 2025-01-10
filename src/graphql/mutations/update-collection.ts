import { graphql, type VariablesOf } from "gql.tada";

export const UpdateCollectionMutation = graphql(`
  mutation UpdateCollection($input: UpdateCollectionInput!) {
    updateCollection(input: $input) {
      id
      name
      description
      isPublic
    }
  }
`);

export type UpdateCollectionInput = VariablesOf<
  typeof UpdateCollectionMutation
>["input"];
