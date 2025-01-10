import { graphql, type VariablesOf } from "gql.tada";

export const CreateCollectionMutation = graphql(`
  mutation CreateCollection($input: CreateCollectionInput!) {
    createCollection(input: $input) {
      id
      name
      description
      isPublic
      userId
      createdAt
    }
  }
`);

export type CreateCollectionInput = VariablesOf<
  typeof CreateCollectionMutation
>["input"];
