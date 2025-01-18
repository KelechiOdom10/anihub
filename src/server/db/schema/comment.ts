import { sql } from "drizzle-orm";
import {
  text,
  int,
  index,
  type AnySQLiteColumn,
} from "drizzle-orm/sqlite-core";

import { sqliteTable, users } from "./auth";

export const comments = sqliteTable(
  "comments",
  {
    id: int("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
    text: text("text").notNull(),
    rating: int("rating").notNull(),
    isSpoiler: int("is_spoiler", { mode: "boolean" }).default(false).notNull(),
    userId: int("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    animeId: int("anime_id").notNull(),
    parentId: int("parent_id").references((): AnySQLiteColumn => comments.id, {
      onDelete: "cascade",
    }),
    createdAt: text("created_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: text("updated_at")
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (t) => ({
    userIdIdx: index("comments_user_idx").on(t.userId),
    animeIdIdx: index("comments_anime_idx").on(t.animeId),
    parentIdIdx: index("comments_parent_idx").on(t.parentId),
  })
);

export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
