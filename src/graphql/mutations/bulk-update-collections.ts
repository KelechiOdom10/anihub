import { graphql } from "gql.tada";

export const BulkUpdateCollectionsMutation = graphql(`
  mutation BulkUpdateCollections($input: BulkUpdateCollectionsInput!) {
    bulkUpdateCollections(input: $input) {
      id
      name
      hasAnime
    }
  }
`);
