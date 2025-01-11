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
const CollectionQueryParamsType = builder.inputType("CollectionQueryParams", {
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
    items: t.field({
      type: [
        builder.inputType("CreateCollectionItem", {
          fields: (t) => ({
            id: t.int({ required: true }),
            animeImage: t.string({ required: true }),
          }),
        }),
      ],
      required: false,
    }),
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

const AddAnimeToNewCollectionInput = builder.inputType(
  "AddAnimeToNewCollectionInput",
  {
    fields: (t) => ({
      name: t.string({ required: true }),
      description: t.string(),
      isPublic: t.boolean({ defaultValue: true }),
      animeId: t.int({ required: true }),
      animeImage: t.string(),
    }),
  }
);

const RemoveAnimeFromCollectionInput = builder.inputType(
  "RemoveAnimeFromCollectionInput",
  {
    fields: (t) => ({
      collectionId: t.int({ required: true }),
      animeId: t.int({ required: true }),
    }),
  }
);

const BulkUpdateCollectionsInput = builder.inputType(
  "BulkUpdateCollectionsInput",
  {
    fields: (t) => ({
      animeId: t.int({ required: true }),
      animeImage: t.string({ required: false }),
      updates: t.field({
        type: [
          builder.inputType("CollectionUpdate", {
            fields: (t) => ({
              collectionId: t.int({ required: true }),
              hasAnime: t.boolean({ required: true }),
            }),
          }),
        ],
        required: true,
      }),
    }),
  }
);

// Queries
builder.queryField("getCollections", (t) =>
  t.drizzleField({
    type: [Collection],
    description: "Get all public collections",
    args: {
      query: t.arg({ type: CollectionQueryParamsType, required: false }),
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

builder.queryField("getMyCollections", (t) =>
  t.drizzleField({
    type: [Collection],
    description: "Get collections for the logged-in user",
    args: {
      query: t.arg({ type: CollectionQueryParamsType, required: false }),
    },
    resolve: async (query, _root, { query: params }, ctx) => {
      if (!ctx.session) throw new Error("Not authenticated");

      const collectionsData = await ctx.db.query.collections.findMany(
        query({
          where: eq(collections.userId, ctx.session.userId),
          orderBy: (collections, { desc }) => [desc(collections.createdAt)],
          limit: params?.limit ?? 10,
          offset: params?.offset ?? 0,
        })
      );

      return collectionsData;
    },
  })
);

// Mutations
builder.mutationField("createCollection", (t) =>
  t.field({
    type: Collection,
    nullable: false,
    args: {
      input: t.arg({ type: CreateCollectionInput, required: true }),
    },
    resolve: async (_root, { input }, ctx) => {
      if (!ctx.session) throw new Error("Not authenticated");

      const collectionData = await ctx.db.transaction(async (tx) => {
        const [collection] = await tx
          .insert(collections)
          .values({
            name: input.name,
            description: input.description,
            isPublic: Boolean(input.isPublic),
            userId: ctx.session?.userId as number,
          })
          .returning();

        if (collection && input.items && input.items.length > 0) {
          await tx.insert(collectionItems).values(
            input.items.map((item) => ({
              collectionId: collection.id,
              animeId: item.id,
              animeImage: item.animeImage,
            }))
          );
        }
        return collection;
      });

      if (!collectionData) {
        throw new Error("Failed to create collection");
      }

      return collectionData;
    },
  })
);

builder.mutationField("updateCollection", (t) =>
  t.drizzleField({
    type: Collection,
    args: {
      input: t.arg({ type: UpdateCollectionInput, required: true }),
    },
    resolve: async (_query, _root, { input }, ctx) => {
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

builder.mutationField("addAnimeToNewCollection", (t) =>
  t.field({
    type: Collection,
    args: {
      input: t.arg({ type: AddAnimeToNewCollectionInput, required: true }),
    },
    resolve: async (_root, { input }, ctx) => {
      if (!ctx.session) throw new Error("Not authenticated");

      return await ctx.db.transaction(async (tx) => {
        // Create the collection first
        const collection = await tx
          .insert(collections)
          .values({
            name: input.name,
            description: input.description,
            isPublic: Boolean(input.isPublic),
            userId: ctx.session?.userId as number,
          })
          .returning()
          .then((res) => res[0]);

        if (!collection) throw new Error("Failed to create collection");

        // Add the anime to the collection
        await tx.insert(collectionItems).values({
          collectionId: collection.id,
          animeId: input.animeId,
          animeImage: input.animeImage,
        });

        // Return the collection with the anime
        return {
          ...collection,
          items: [{ id: input.animeId, animeImage: input.animeImage }],
        };
      });
    },
  })
);

builder.mutationField("removeAnimeFromCollection", (t) =>
  t.field({
    type: Collection,
    args: {
      input: t.arg({ type: RemoveAnimeFromCollectionInput, required: true }),
    },
    resolve: async (_root, { input }, ctx) => {
      if (!ctx.session) throw new Error("Not authenticated");

      const collection = await ctx.db.query.collections.findFirst({
        where: (collections, { eq }) => eq(collections.id, input.collectionId),
      });

      if (!collection) throw new Error("Collection not found");

      if (collection.userId !== ctx.session.userId) {
        throw new Error("Not authorized");
      }

      await ctx.db
        .delete(collectionItems)
        .where(
          and(
            eq(collectionItems.collectionId, input.collectionId),
            eq(collectionItems.animeId, input.animeId)
          )
        );

      return collection;
    },
  })
);

builder.mutationField("bulkUpdateCollections", (t) =>
  t.drizzleField({
    type: [Collection],
    args: {
      input: t.arg({ type: BulkUpdateCollectionsInput, required: true }),
    },
    resolve: async (query, _root, { input }, ctx) => {
      if (!ctx.session) throw new Error("Not authenticated");

      const collections = await ctx.db.query.collections.findMany(
        query({
          where: (collections, { inArray }) =>
            inArray(
              collections.id,
              input.updates.map((u) => u.collectionId)
            ),
        })
      );

      // Verify ownership of all collections
      for (const collection of collections) {
        if (collection.userId !== ctx.session.userId) {
          throw new Error("Not authorized to update one or more collections");
        }
      }

      // Process updates in a transaction
      await ctx.db.transaction(async (tx) => {
        for (const update of input.updates) {
          if (update.hasAnime) {
            // Add anime to collection if not exists
            await tx
              .insert(collectionItems)
              .values({
                collectionId: update.collectionId,
                animeId: input.animeId,
                animeImage: input.animeImage,
              })
              .onConflictDoNothing();
          } else {
            // Remove anime from collection
            await tx
              .delete(collectionItems)
              .where(
                and(
                  eq(collectionItems.collectionId, update.collectionId),
                  eq(collectionItems.animeId, input.animeId)
                )
              );
          }
        }
      });

      return collections;
    },
  })
);
