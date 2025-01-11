import { sql } from "drizzle-orm";
import {
  text,
  int,
  sqliteTableCreator,
  index,
  primaryKey,
} from "drizzle-orm/sqlite-core";

import { DATABASE_PREFIX } from "~/lib/constants";

export const sqliteTable = sqliteTableCreator(
  (name) => `${DATABASE_PREFIX}_${name}`
);

export const users = sqliteTable(
  "users",
  {
    id: int("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
    email: text("email", { length: 255 }).unique().notNull(),
    emailVerified: int("email_verified", { mode: "boolean" })
      .default(false)
      .notNull(),
    hashedPassword: text("hashed_password", { length: 255 }),
    username: text("username", { length: 255 }).unique(),
    avatar: text("avatar", { length: 255 }),
    createdAt: text("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: text("updated_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (t) => ({
    emailIdx: index("users_email_idx").on(t.email),
  })
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: int("user_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),
    expiresAt: int("expires_at", { mode: "timestamp" }).notNull(),
  },
  (t) => ({
    userIdIdx: index("sessions_user_idx").on(t.userId),
  })
);
export type Session = typeof sessions.$inferSelect;

export const emailVerificationCodes = sqliteTable(
  "email_verification_codes",
  {
    id: int("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
    userId: int("user_id")
      .unique()
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),
    email: text("email", { length: 255 }).notNull(),
    code: text("code", { length: 8 }).notNull(),
    expiresAt: int("expires_at", { mode: "timestamp" }).notNull(),
  },
  (t) => ({
    codeIdx: index("verification_codes_code_idx").on(t.code),
  })
);

export const passwordResetTokens = sqliteTable(
  "password_reset_tokens",
  {
    id: text("id").primaryKey(),
    userId: int("user_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),
    expiresAt: int("expires_at", { mode: "timestamp" }).notNull(),
  },
  (t) => ({
    userIdIdx: index("reset_tokens_user_idx").on(t.userId),
  })
);

export const oauthProviders = ["google", "discord"] as const;
export const oauthAccounts = sqliteTable(
  "oauth_accounts",
  {
    userId: int("user_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),
    provider: text("provider", { enum: oauthProviders }).notNull(),
    providerUserId: text("provider_user_id", { length: 255 }).notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.provider, t.providerUserId] }),
    userIdIdx: index("oauth_accounts_user_idx").on(t.userId),
    providerIdx: index("oauth_accounts_provider_idx").on(t.provider),
    providerUserIdIdx: index("oauth_accounts_provider_user_id_idx").on(
      t.providerUserId
    ),
  })
);
