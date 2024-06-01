import SchemaBuilder from "@pothos/core";
import ValidationPlugin from "@pothos/plugin-validation";
import { GraphQLError } from "graphql";
import { animeService } from "./services/anime.service";
import { type GraphqlServerContext } from "./context";

const builder = new SchemaBuilder<{ Context: GraphqlServerContext }>({
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

builder.queryType({
  fields: (t) => ({
    hello: t.string({
      args: {
        name: t.arg.string({
          validate: {
            length: [4, { message: "Name must be at least 4 characters long" }],
          },
        }),
      },
      resolve: (parent, { name }) => {
        return `Hello, ${name ?? "World!!!"}`;
      },
    }),
    topAnimeIds: t.intList({
      resolve: async () => {
        const { data } = await animeService.GET("/top/anime");
        if (!data?.data) return [];

        const ids = data.data.reduce((acc: number[], { mal_id }) => {
          if (mal_id !== undefined) acc.push(mal_id);
          return acc;
        }, []);

        return ids;
      },
    }),
    isLoggedIn: t.boolean({
      resolve: async (parent, args, { session }) => {
        return Boolean(session);
      },
    }),
  }),
});

export const schema = builder.toSchema();
