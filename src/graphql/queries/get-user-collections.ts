import { graphql, type ResultOf, type VariablesOf } from "gql.tada";

export const GetMyCollectionsQuery = graphql(`
  query GetMyCollections($query: CollectionQueryParams, $animeId: Int) {
    getMyCollections(query: $query) {
      id
      name
      description
      thumbnail
      totalItems
      isPublic
      userId
      createdAt
      updatedAt
      hasAnime(animeId: $animeId)
    }
  }
`);

export type GetMyCollectionsResult = ResultOf<typeof GetMyCollectionsQuery>;
export type GetMyCollectionsQueryParams = VariablesOf<
  typeof GetMyCollectionsQuery
>;
