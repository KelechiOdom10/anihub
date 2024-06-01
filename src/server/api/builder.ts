import SchemaBuilder from "@pothos/core";
import ValidationPlugin from "@pothos/plugin-validation";
import { GraphQLError } from "graphql";

import { type GraphqlServerContext } from "./context";

const builder = new SchemaBuilder<{
  Context: GraphqlServerContext;
}>({
  plugins: [ValidationPlugin],
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

export { builder };
