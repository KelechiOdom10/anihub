import {
  boolean,
  datetime,
  index,
  int,
  mysqlEnum,
  primaryKey,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";
import { mysqlTable } from "@/server/db/util";

export const users = mysqlTable(
  "user",
  {
    id: varchar("id", { length: 21 }).primaryKey(),
    email: varchar("email", { length: 255 }).unique().notNull(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    hashedPassword: varchar("hashed_password", { length: 255 }),
    avatar: varchar("avatar", { length: 255 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").onUpdateNow().notNull(),
  },
  (t) => ({
    emailIdx: index("email_idx").on(t.email),
  }),
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export const sessions = mysqlTable(
  "sessions",
  {
    id: varchar("id", { length: 255 }).primaryKey(),
    userId: varchar("user_id", { length: 21 })
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),
    expiresAt: datetime("expires_at").notNull(),
  },
  (t) => ({
    userIdx: index("user_idx").on(t.userId),
  }),
);

export const emailVerificationCodes = mysqlTable(
  "email_verification_codes",
  {
    id: int("id").primaryKey().autoincrement(),
    userId: varchar("user_id", { length: 21 })
      .unique()
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),
    email: varchar("email", { length: 255 }).notNull(),
    code: varchar("code", { length: 8 }).notNull(),
    expiresAt: datetime("expires_at").notNull(),
  },
  (t) => ({
    userIdx: index("user_idx").on(t.userId),
    emailIdx: index("email_idx").on(t.email),
  }),
);

export const passwordResetTokens = mysqlTable(
  "password_reset_tokens",
  {
    id: varchar("id", { length: 40 }).primaryKey(),
    userId: varchar("user_id", { length: 21 })
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),
    expiresAt: datetime("expires_at").notNull(),
  },
  (t) => ({
    userIdx: index("user_idx").on(t.userId),
  }),
);

export const oauthProviders = ["google", "discord"] as const;
export const oauthAccounts = mysqlTable(
  "oauth_accounts",
  {
    userId: varchar("user_id", { length: 21 })
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),
    provider: mysqlEnum("provider", oauthProviders).notNull(),
    providerUserId: varchar("provider_user_id", { length: 255 }).notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.provider, t.providerUserId] }),
    userIdx: index("user_idx").on(t.userId),
    providerIdx: index("provider_idx").on(t.provider),
    providerUserIdIdx: index("provider_user_id_idx").on(t.providerUserId),
  }),
);
