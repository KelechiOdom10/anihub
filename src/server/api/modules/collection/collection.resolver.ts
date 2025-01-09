import { and, eq, sql } from "drizzle-orm";

import { Collection, CollectionItem } from "./collection.model";

import { builder } from "../../builder";

import {
  collections,
  collectionItems,
  collectionLikes,
  type Collection as CollectionType,
  type CollectionItem as CollectionItemType,
  type CollectionLike as CollectionLikeType,
} from "~/server/db/schema";

// Object References
export const CollectionRef = builder.objectRef<CollectionType>("Collection");
export const CollectionItemRef =
  builder.objectRef<CollectionItemType>("CollectionItem");
export const CollectionLikeRef =
  builder.objectRef<CollectionLikeType>("CollectionLike");

// Input Types
const CollectionsQueryParamsType = builder.inputType("CollectionsQueryParams", {
  fields: (t) => ({
    limit: t.int(),
    offset: t.int(),
  }),
});

const CreateCollectionInput = builder.inputType("CreateCollectionInput", {
  fields: (t) => ({
    name: t.string({ required: true }),
    description: t.string(),
    isPublic: t.boolean({ defaultValue: true }),
  }),
});

const UpdateCollectionInput = builder.inputType("UpdateCollectionInput", {
  fields: (t) => ({
    id: t.int({ required: true }),
    name: t.string({ required: false }),
    description: t.string({ required: false }),
    isPublic: t.boolean({ required: false }),
  }),
});

const AddAnimeToCollectionInput = builder.inputType(
  "AddAnimeToCollectionInput",
  {
    fields: (t) => ({
      collectionId: t.int({ required: true }),
      animeId: t.int({ required: true }),
      animeImage: t.string(),
    }),
  }
);

// Queries
builder.queryField("getCollections", (t) =>
  t.drizzleField({
    type: [Collection],
    description: "Get all public collections",
    args: {
      query: t.arg({ type: CollectionsQueryParamsType, required: false }),
    },
    resolve: async (query, _root, args, ctx) => {
      return await ctx.db.query.collections.findMany(
        query({
          where: eq(collections.isPublic, true),
          orderBy: (collections, { desc }) => [desc(collections.likesCount)],
          limit: args.query?.limit ?? 10,
          offset: args.query?.offset ?? 0,
        })
      );
    },
  })
);

builder.queryField("getCollection", (t) =>
  t.drizzleField({
    type: Collection,
    description: "Get collection by ID",
    args: {
      id: t.arg.int({ required: true }),
    },
    resolve: async (query, _root, { id }, ctx) => {
      return await ctx.db.query.collections.findFirst(
        query({
          where: eq(collections.id, id),
          with: {
            user: true,
            items: true,
          },
        })
      );
    },
  })
);

builder.queryField("getCollectionItems", (t) =>
  t.drizzleField({
    type: [CollectionItem],
    description: "Get collection items by collection ID",
    args: {
      collectionId: t.arg.int({ required: true }),
    },
    resolve: async (query, _root, { collectionId }, ctx) => {
      return await ctx.db.query.collectionItems.findMany(
        query({
          where: eq(collectionItems.collectionId, collectionId),
        })
      );
    },
  })
);

// Mutations
builder.mutationField("createCollection", (t) =>
  t.drizzleField({
    type: Collection,
    args: {
      input: t.arg({ type: CreateCollectionInput, required: true }),
    },
    resolve: async (query, _root, { input }, ctx) => {
      if (!ctx.session) throw new Error("Not authenticated");

      const [collection] = await ctx.db
        .insert(collections)
        .values({
          name: input.name,
          description: input.description,
          isPublic: Boolean(input.isPublic),
          userId: ctx.session.userId,
        })
        .returning();

      return collection;
    },
  })
);

builder.mutationField("updateCollection", (t) =>
  t.drizzleField({
    type: Collection,
    args: {
      input: t.arg({ type: UpdateCollectionInput, required: true }),
    },
    resolve: async (query, _root, { input }, ctx) => {
      if (!ctx.session) throw new Error("Not authenticated");

      // Create an update object only with provided fields
      const updateData = {
        ...(input.name && { name: input.name }),
        ...(input.description && { description: input.description }),
        ...(input.isPublic !== undefined && {
          isPublic: Boolean(input.isPublic),
        }),
      };

      const [collection] = await ctx.db
        .update(collections)
        .set(updateData)
        .where(eq(collections.id, input.id))
        .returning();

      return collection;
    },
  })
);

builder.mutationField("addAnimeToCollection", (t) =>
  t.field({
    type: CollectionItem,
    args: {
      input: t.arg({ type: AddAnimeToCollectionInput, required: true }),
    },
    resolve: async (_parent, { input }, ctx) => {
      if (!ctx.session) throw new Error("Not authenticated");

      // Verify collection ownership
      const collection = await ctx.db.query.collections.findFirst({
        where: eq(collections.id, input.collectionId),
      });

      if (!collection) throw new Error("Collection not found");
      if (collection.userId !== ctx.session.userId) {
        throw new Error("Not authorized to modify this collection");
      }

      // Add anime to collection
      const [item] = await ctx.db
        .insert(collectionItems)
        .values({
          collectionId: input.collectionId,
          animeId: input.animeId,
          animeImage: input.animeImage,
        })
        .returning();

      return item;
    },
  })
);

builder.mutationField("toggleCollectionLike", (t) =>
  t.drizzleField({
    type: Collection,
    args: {
      collectionId: t.arg.int({ required: true }),
    },
    resolve: async (query, _root, { collectionId }, ctx) => {
      if (!ctx.session) throw new Error("Not authenticated");

      const existingLike = await ctx.db.query.collectionLikes.findFirst({
        where: and(
          eq(collectionLikes.collectionId, collectionId),
          eq(collectionLikes.userId, ctx.session.userId)
        ),
      });

      await ctx.db.transaction(async (tx) => {
        if (existingLike) {
          await tx
            .delete(collectionLikes)
            .where(eq(collectionLikes.id, existingLike.id));

          await tx
            .update(collections)
            .set({
              likesCount: sql`${collections.likesCount} - 1`,
            })
            .where(eq(collections.id, collectionId));
        } else {
          await tx.insert(collectionLikes).values({
            collectionId,
            userId: ctx.session?.userId as number,
          });

          await tx
            .update(collections)
            .set({
              likesCount: sql`${collections.likesCount} + 1`,
            })
            .where(eq(collections.id, collectionId));
        }
      });

      return await ctx.db.query.collections.findFirst(
        query({
          where: eq(collections.id, collectionId),
        })
      );
    },
  })
);
