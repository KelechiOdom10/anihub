import { registerUrql } from "@urql/next/rsc";
import { initGraphQLTada } from "gql.tada";
import { cacheExchange, createClient, fetchExchange } from "urql/core";

import type { introspection } from "./graphql-env";
import { getUrl } from "./shared";

import { env } from "~/env";

const makeClient = () => {
  return createClient({
    url:
      env.NODE_ENV !== "development"
        ? "https://anihubb.vercel.app/api/graphql"
        : getUrl(),
    exchanges: [cacheExchange, fetchExchange],
    suspense: true,
  });
};

export const { getClient } = registerUrql(makeClient);

export const graphql = initGraphQLTada<{ introspection: introspection }>();

export type { FragmentOf, ResultOf, VariablesOf } from "gql.tada";
export { readFragment } from "gql.tada";
