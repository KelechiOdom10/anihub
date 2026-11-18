import { sql } from "void/db";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
  type AnySQLiteColumn,
} from "void/schema-d1";

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
    emailVerified: integer("email_verified", { mode: "boolean" })
      .notNull()
      .default(false),
    image: text("image"),
    username: text("username").unique(),
    privacyPolicyVersion: text("privacy_policy_version"),
    privacyConsentedAt: integer("privacy_consented_at", {
      mode: "timestamp_ms",
    }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("user_normalized_email").on(sql`lower(trim(${table.email}))`),
  ]
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
  (table) => [index("session_user_idx").on(table.userId)]
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
    accessTokenExpiresAt: integer("access_token_expires_at", {
      mode: "timestamp_ms",
    }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", {
      mode: "timestamp_ms",
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("account_provider_identity").on(
      table.providerId,
      table.accountId
    ),
    index("account_user_idx").on(table.userId),
  ]
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
  (table) => [index("verification_identifier_idx").on(table.identifier)]
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
  (table) => [index("collections_user_idx").on(table.userId)]
);

export const collectionItems = sqliteTable(
  "collection_items",
  {
    id: id(),
    collectionId: text("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    animeId: integer("anime_id"),
    malId: integer("mal_id"),
    animeImage: text("anime_image"),
    addedAt: integer("added_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    index("collection_items_collection_idx").on(table.collectionId),
    uniqueIndex("collection_items_anime_unique").on(
      table.collectionId,
      table.animeId
    ),
    uniqueIndex("collection_items_mal_unique").on(
      table.collectionId,
      table.malId
    ),
  ]
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
  (table) => [
    uniqueIndex("collection_likes_unique").on(table.collectionId, table.userId),
    index("collection_likes_user_idx").on(table.userId),
  ]
);

export const comments = sqliteTable(
  "comments",
  {
    id: id(),
    text: text("text").notNull(),
    rating: integer("rating").notNull(),
    isSpoiler: integer("is_spoiler", { mode: "boolean" })
      .notNull()
      .default(false),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    animeId: integer("anime_id"),
    malId: integer("mal_id"),
    parentId: text("parent_id").references((): AnySQLiteColumn => comments.id, {
      onDelete: "cascade",
    }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("comments_user_idx").on(table.userId),
    index("comments_anime_idx").on(table.animeId),
    index("comments_mal_idx").on(table.malId),
    index("comments_parent_idx").on(table.parentId),
  ]
);
