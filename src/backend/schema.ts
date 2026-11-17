import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
  type AnySQLiteColumn,
} from "drizzle-orm/sqlite-core";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());
const createdAt = () =>
  integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date());
const updatedAt = () =>
  integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date());

export const user = sqliteTable(
  "user",
  {
    id: id(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
    image: text("image"),
    username: text("username").unique(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("user_normalized_email").on(sql`lower(trim(${t.email}))`)],
);

export const session = sqliteTable(
  "session",
  {
    id: id(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [index("session_user_idx").on(t.userId)],
);

export const account = sqliteTable(
  "account",
  {
    id: id(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp_ms" }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp_ms" }),
    scope: text("scope"),
    password: text("password"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("account_provider_identity").on(t.providerId, t.accountId),
    index("account_user_idx").on(t.userId),
  ],
);

export const verification = sqliteTable(
  "verification",
  {
    id: id(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

export const animeCache = sqliteTable("anime_cache", {
  id: integer("id").primaryKey(),
  malId: integer("mal_id").unique(),
  data: text("data", { mode: "json" }).$type<unknown>().notNull(),
  updatedAt: updatedAt(),
});

export const cacheEntries = sqliteTable("cache_entries", {
  key: text("key").primaryKey(),
  data: text("data", { mode: "json" }).$type<unknown>().notNull(),
  updatedAt: updatedAt(),
});

export const collections = sqliteTable(
  "collections",
  {
    id: id(),
    name: text("name").notNull(),
    description: text("description"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    isPublic: integer("is_public", { mode: "boolean" }).notNull().default(true),
    likesCount: integer("likes_count").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("collections_user_idx").on(t.userId)],
);

export const collectionItems = sqliteTable(
  "collection_items",
  {
    id: id(),
    collectionId: text("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    animeId: integer("anime_id").references(() => animeCache.id),
    malId: integer("mal_id"),
    animeImage: text("anime_image"),
    addedAt: integer("added_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (t) => [
    index("collection_items_collection_idx").on(t.collectionId),
    uniqueIndex("collection_items_anime_unique").on(t.collectionId, t.animeId),
    uniqueIndex("collection_items_mal_unique").on(t.collectionId, t.malId),
  ],
);

export const collectionLikes = sqliteTable(
  "collection_likes",
  {
    id: id(),
    collectionId: text("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("collection_likes_unique").on(t.collectionId, t.userId),
    index("collection_likes_user_idx").on(t.userId),
  ],
);

export const comments = sqliteTable(
  "comments",
  {
    id: id(),
    text: text("text").notNull(),
    rating: integer("rating").notNull(),
    isSpoiler: integer("is_spoiler", { mode: "boolean" }).notNull().default(false),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    animeId: integer("anime_id").references(() => animeCache.id),
    malId: integer("mal_id"),
    parentId: text("parent_id").references((): AnySQLiteColumn => comments.id, {
      onDelete: "cascade",
    }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("comments_user_idx").on(t.userId),
    index("comments_anime_idx").on(t.animeId),
    index("comments_mal_idx").on(t.malId),
    index("comments_parent_idx").on(t.parentId),
  ],
);

export const users = user;
