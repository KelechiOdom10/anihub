// Next.js Custom Route Handler: https://nextjs.org/docs/app/building-your-application/routing/router-handlers
import { createYoga } from "graphql-yoga";

import { createContext } from "~/server/api/context";
import { schema } from "~/server/api/schema";

const { handleRequest } = createYoga({
  schema: schema,

  // While using Next.js file convention for routing, we need to configure Yoga to use the correct endpoint
  graphqlEndpoint: "/api/graphql",

  // Yoga needs to know how to create a valid Next response
  fetchAPI: { Response, Request },

  // Context
  context: createContext,

  logging: true,
});

export {
  handleRequest as GET,
  handleRequest as POST,
  handleRequest as OPTIONS,
};
