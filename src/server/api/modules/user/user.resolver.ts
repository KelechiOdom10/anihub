import { eq } from "drizzle-orm";

import { builder } from "../../builder";

import { users, type User as UserType } from "~/server/db/schema";

export const UserObjectRef = builder.objectRef<UserType>("User");

export const User = builder.drizzleObject("users", {
  description: "User object",
  fields: (t) => ({
    id: t.exposeID("id"),
    email: t.exposeString("email"),
    avatar: t.exposeString("avatar", { nullable: true }),
    username: t.exposeString("username"),
    collections: t.relation("collections", {
      args: {
        limit: t.arg.int({ required: false, defaultValue: 10 }),
        offset: t.arg.int({ required: false, defaultValue: 0 }),
      },
      query: (args) => ({
        limit: args.limit ?? 10,
        offset: args.offset ?? 0,
        orderBy: (collection, ops) => ops.desc(collection.createdAt),
      }),
    }),
  }),
});

builder.queryField("me", (t) =>
  t.field({
    type: User,
    description: "Get current logged in user",
    nullable: true,
    resolve: async (_parent, _args, ctx) => {
      if (!ctx.session) return null;

      return await ctx.db.query.users.findFirst({
        where: eq(users.id, ctx.session.userId),
      });
    },
  })
);
