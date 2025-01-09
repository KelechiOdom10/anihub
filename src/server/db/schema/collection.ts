import { sql } from "drizzle-orm";
import { text, int, index } from "drizzle-orm/sqlite-core";

import { sqliteTable } from "./auth";
import { users } from "./auth";

export const collections = sqliteTable(
  "collections",
  {
    id: int("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
    name: text("name", { length: 255 }).notNull(),
    description: text("description"),
    userId: int("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    isPublic: int("is_public", { mode: "boolean" }).default(true).notNull(),
    likesCount: int("likes_count").default(0).notNull(),
    createdAt: text("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: text("updated_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (t) => ({
    userIdIdx: index("collections_user_idx").on(t.userId),
    nameIdx: index("collections_name_idx").on(t.name),
  })
);

export const collectionItems = sqliteTable(
  "collection_items",
  {
    id: int("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
    collectionId: int("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    animeId: int("anime_id").notNull(), // Jikan API anime ID
    animeImage: text("anime_image", { length: 255 }),
    addedAt: text("added_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (t) => ({
    collectionIdIdx: index("collection_items_collection_idx").on(
      t.collectionId
    ),
    animeIdIdx: index("collection_items_anime_idx").on(t.animeId),
    uniqueAnimeInCollection: index("unique_anime_in_collection").on(
      t.collectionId,
      t.animeId
    ),
  })
);

export const collectionLikes = sqliteTable(
  "collection_likes",
  {
    id: int("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
    collectionId: int("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    userId: int("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: text("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (t) => ({
    collectionIdIdx: index("collection_likes_collection_idx").on(
      t.collectionId
    ),
    userIdIdx: index("collection_likes_user_idx").on(t.userId),
    uniqueLike: index("unique_collection_like").on(t.collectionId, t.userId),
  })
);

export type Collection = typeof collections.$inferSelect;
export type NewCollection = typeof collections.$inferInsert;
export type CollectionItem = typeof collectionItems.$inferSelect;
export type NewCollectionItem = typeof collectionItems.$inferInsert;
export type CollectionLike = typeof collectionLikes.$inferSelect;
export type NewCollectionLike = typeof collectionLikes.$inferInsert;
