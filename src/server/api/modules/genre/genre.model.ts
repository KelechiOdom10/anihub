type GenreType = NonNullable<components["schemas"]["genre"]>;

import { builder } from "../../builder";
import { Anime } from "../anime";
import { animeService } from "../anime/anime.service";

import { type components } from "~/server/jikan-schema";

export const Genre = builder.objectRef<GenreType>("Genre").implement({
  description: "Genre object",
  fields: (t) => ({
    id: t.exposeID("mal_id", { nullable: true }),
    url: t.exposeString("url", { nullable: true }),
    name: t.exposeString("name", { nullable: true }),
    count: t.exposeInt("count", { nullable: true }),
    animes: t.field({
      type: [Anime],
      nullable: true,
      args: {
        page: t.arg.int({ required: false, defaultValue: 1 }),
        limit: t.arg.int({ required: false, defaultValue: 3 }),
      },
      resolve: async (parent, args) => {
        if (!parent.mal_id) return null;

        const { data } = await animeService.GET("/anime", {
          params: {
            query: {
              genres: `${parent.mal_id}`,
              page: args.page ?? 1,
              limit: args.limit ?? 10,
            },
          },
        });

        if (!data?.data) return [];

        return data.data;
      },
    }),
  }),
});
