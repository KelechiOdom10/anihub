import { and, eq } from "drizzle-orm";

import { builder } from "../../builder";
import { Anime } from "../anime";
import { animeService } from "../anime/anime.service";

import { collectionLikes } from "~/server/db/schema";

// // Object References
// export const CollectionRef = builder.objectRef<CollectionType>("Collection");
// export const CollectionItemRef =
//   builder.objectRef<CollectionItemType>("CollectionItem");
// export const CollectionLikeRef =
//   builder.objectRef<CollectionLikeType>("CollectionLike");

// Collection Type
export const Collection = builder.drizzleObject("collections", {
  name: "Collection",
  fields: (t) => ({
    id: t.exposeID("id"),
    name: t.exposeString("name"),
    description: t.exposeString("description", { nullable: true }),
    userId: t.exposeInt("userId"),
    isPublic: t.exposeBoolean("isPublic"),
    likesCount: t.exposeInt("likesCount"),
    createdAt: t.exposeString("createdAt"),
    updatedAt: t.exposeString("updatedAt"),
    // Relations
    user: t.relation("user"),
    items: t.relation("items", {
      args: {
        limit: t.arg.int({ required: false, defaultValue: 10 }),
        offset: t.arg.int({ required: false, defaultValue: 0 }),
      },
      query: (args) => ({
        limit: args.limit ?? 10,
        offset: args.offset ?? 0,
        orderBy: (collectionItems, { desc }) => [desc(collectionItems.addedAt)],
      }),
    }),
    isLiked: t.boolean({
      resolve: async (parent, _args, ctx) => {
        if (!ctx.session) return false;

        const like = await ctx.db.query.collectionLikes.findFirst({
          where: and(
            eq(collectionLikes.collectionId, parent.id),
            eq(collectionLikes.userId, ctx.session.userId)
          ),
        });
        return !!like;
      },
    }),
  }),
});

// Collection Item Type
export const CollectionItem = builder.drizzleObject("collectionItems", {
  name: "CollectionItem",
  fields: (t) => ({
    id: t.exposeID("id"),
    collectionId: t.exposeInt("collectionId"),
    animeId: t.exposeInt("animeId"),
    animeImage: t.exposeString("animeImage", { nullable: true }),
    anime: t.field({
      nullable: true,
      type: Anime,
      resolve: async (parent, _args) => {
        const data = await animeService.GET(`/anime/{id}`, {
          params: {
            path: { id: parent.animeId },
          },
        });

        return data.data?.data ?? null;
      },
    }),
    addedAt: t.exposeString("addedAt"),
    collection: t.relation("collection"),
  }),
});
