import { relations } from "drizzle-orm";

import { users } from "./auth";
import { collections, collectionItems, collectionLikes } from "./collection";

export const userRelations = relations(users, ({ many }) => ({
  collections: many(collections),
}));

export const collectionsRelations = relations(collections, ({ one, many }) => ({
  user: one(users, {
    fields: [collections.userId],
    references: [users.id],
  }),
  items: many(collectionItems),
  likes: many(collectionLikes),
}));

export const collectionItemsRelations = relations(
  collectionItems,
  ({ one }) => ({
    collection: one(collections, {
      fields: [collectionItems.collectionId],
      references: [collections.id],
    }),
  })
);

export const collectionLikesRelations = relations(
  collectionLikes,
  ({ one }) => ({
    collection: one(collections, {
      fields: [collectionLikes.collectionId],
      references: [collections.id],
    }),
    user: one(users, {
      fields: [collectionLikes.userId],
      references: [users.id],
    }),
  })
);
