import { type ResultOf, type VariablesOf, graphql } from "gql.tada";

import { ProducerPreview } from "../fragments";

export const ProducerSearchQuery = graphql(
  `
    query ProducerSearch($query: ProducerSearchQueryParams) {
      getProducers(query: $query) {
        data {
          ...ProducerPreview
        }
      }
    }
  `,
  [ProducerPreview]
);
export type ProducerSearchResult = ResultOf<typeof ProducerSearchQuery>;
export type ProducerSearchQueryParams = VariablesOf<typeof ProducerSearchQuery>;
