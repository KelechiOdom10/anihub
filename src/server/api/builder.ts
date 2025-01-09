import SchemaBuilder from "@pothos/core";
import DrizzlePlugin from "@pothos/plugin-drizzle";
import ValidationPlugin from "@pothos/plugin-validation";
import { GraphQLError } from "graphql";

import { type GraphqlServerContext } from "./context";

import { db } from "../db";
import * as schema from "../db/schema";

const builder = new SchemaBuilder<{
  Context: GraphqlServerContext;
  DrizzleSchema: typeof schema;
}>({
  plugins: [ValidationPlugin, DrizzlePlugin],
  drizzle: {
    client: db,
    schema,
  },
  validationOptions: {
    validationError: (zodError, _, __, info) => {
      if (zodError.errors[0]) {
        const [{ message, path, code }] = zodError.errors;
        return new GraphQLError(message, {
          path: [...(info.path.key ? [info.path.key] : []), ...path],
          extensions: {
            code: code ?? "VALIDATION_ERROR",
            http: {
              status: 400,
            },
          },
        });
      }

      return new GraphQLError("An unknown error occurred", {
        extensions: {
          code: "UNKNOWN_ERROR",
        },
      });
    },
  },
});

builder.queryType({});
builder.mutationType({});

export { builder };
