import { and, count, eq, isNotNull } from "drizzle-orm";

import { builder } from "../../builder";
import { Anime } from "../anime";
import { animeService } from "../anime/anime.service";

import { collectionItems, collectionLikes } from "~/server/db/schema";
// Collection Type
export const Collection = builder.drizzleObject("collections", {
  name: "Collection",
  fields: (t) => ({
    id: t.exposeID("id", { nullable: false }),
    name: t.exposeString("name"),
    description: t.exposeString("description", { nullable: true }),
    userId: t.exposeInt("userId"),
    isPublic: t.exposeBoolean("isPublic"),
    likesCount: t.exposeInt("likesCount"),
    createdAt: t.exposeString("createdAt"),
    updatedAt: t.exposeString("updatedAt"),
    thumbnail: t.field({
      type: "String",
      resolve: async (parent, _args, { db }) => {
        const item = await db.query.collectionItems.findFirst({
          where: (items, { and, eq }) =>
            and(eq(items.collectionId, parent.id), isNotNull(items.animeImage)),
        });

        return item?.animeImage ?? "/fallback-anime.avif";
      },
    }),
    hasAnime: t.field({
      type: "Boolean",
      args: {
        animeId: t.arg({ type: "Int", required: false }),
      },
      resolve: async (collection, { animeId }, { db }) => {
        if (!animeId) return false;

        const item = await db.query.collectionItems.findFirst({
          where: (items, { and, eq }) =>
            and(
              eq(items.collectionId, collection.id),
              eq(items.animeId, animeId)
            ),
        });
        return !!item;
      },
    }),
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
