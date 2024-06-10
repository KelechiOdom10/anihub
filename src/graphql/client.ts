import { registerUrql } from "@urql/next/rsc";
import { initGraphQLTada } from "gql.tada";
import { cacheExchange, createClient, fetchExchange } from "urql/core";

import type { introspection } from "./graphql-env";
import { getUrl } from "./shared";

const makeClient = () => {
  return createClient({
    url: getUrl(),
    exchanges: [cacheExchange, fetchExchange],
  });
};

export const { getClient } = registerUrql(makeClient);

export const graphql = initGraphQLTada<{ introspection: introspection }>();

export type { FragmentOf, ResultOf, VariablesOf } from "gql.tada";
export { readFragment } from "gql.tada";
