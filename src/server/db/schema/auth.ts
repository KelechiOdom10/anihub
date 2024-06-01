import { sql } from "drizzle-orm";
import {
  index,
  primaryKey,
  text,
  integer,
  sqliteTable,
} from "drizzle-orm/sqlite-core";

export const users = sqliteTable(
  "user",
  {
    id: text("id", { length: 21 }).primaryKey(),
    email: text("email", { length: 255 }).unique().notNull(),
    emailVerified: integer("id", { mode: "boolean" }).default(false).notNull(),
    hashedPassword: text("hashed_password", { length: 255 }),
    avatar: text("avatar", { length: 255 }),
    createdAt: text("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: text("updated_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (t) => ({
    emailIdx: index("email_idx").on(t.email),
  })
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id", { length: 255 }).primaryKey(),
    userId: text("user_id", { length: 21 })
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  },
  (t) => ({
    userIdx: index("user_idx").on(t.userId),
  })
);

export const emailVerificationCodes = sqliteTable(
  "email_verification_codes",
  {
    id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
    userId: text("user_id", { length: 21 })
      .unique()
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),
    email: text("email", { length: 255 }).notNull(),
    code: text("code", { length: 8 }).notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  },
  (t) => ({
    userIdx: index("user_idx").on(t.userId),
    emailIdx: index("email_idx").on(t.email),
  })
);

export const passwordResetTokens = sqliteTable(
  "password_reset_tokens",
  {
    id: text("id", { length: 40 }).primaryKey(),
    userId: text("user_id", { length: 21 })
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  },
  (t) => ({
    userIdx: index("user_idx").on(t.userId),
  })
);

export const oauthProviders = ["google", "discord"] as const;
export const oauthAccounts = sqliteTable(
  "oauth_accounts",
  {
    userId: text("user_id", { length: 21 })
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),
    provider: text("provider", { enum: oauthProviders }).notNull(),
    providerUserId: text("provider_user_id", { length: 255 }).notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.provider, t.providerUserId] }),
    userIdx: index("user_idx").on(t.userId),
    providerIdx: index("provider_idx").on(t.provider),
    providerUserIdIdx: index("provider_user_id_idx").on(t.providerUserId),
  })
);
