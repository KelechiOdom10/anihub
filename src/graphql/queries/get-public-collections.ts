import { graphql, type ResultOf, type VariablesOf } from "gql.tada";

export const GetPublicCollectionsQuery = graphql(`
  query GetPublicCollections($query: CollectionQueryParams) {
    getCollections(query: $query) {
      id
      name
      description
      thumbnail
      totalItems
      user {
        id
        avatar
        username
      }
      items(limit: 3) {
        id
        animeImage
      }
    }
  }
`);

export type GetPublicCollectionsResult = ResultOf<
  typeof GetPublicCollectionsQuery
>;
export type GetPublicCollectionsQueryParams = VariablesOf<
  typeof GetPublicCollectionsQuery
>;
