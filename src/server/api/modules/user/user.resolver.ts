import { eq } from "drizzle-orm";

import { builder } from "../../builder";

import { users, type User as UserType } from "~/server/db/schema";

export const UserObjectRef = builder.objectRef<UserType>("User");

export const User = builder.objectType(UserObjectRef, {
  description: "User object",
  fields: (t) => ({
    id: t.exposeID("id"),
    email: t.exposeString("email"),
    emailVerified: t.exposeBoolean("emailVerified"),
    avatar: t.exposeString("avatar", { nullable: true }),
    createdAt: t.exposeString("createdAt"),
    updatedAt: t.exposeString("updatedAt"),
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
