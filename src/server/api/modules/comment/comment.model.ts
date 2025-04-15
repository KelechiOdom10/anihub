import { builder } from "../../builder";

export const Comment = builder.drizzleObject("comments", {
  name: "Comment",
  description: "Comment on an anime",
  fields: (t) => ({
    id: t.exposeInt("id"),
    text: t.exposeString("text"),
    rating: t.exposeInt("rating"),
    isSpoiler: t.exposeBoolean("isSpoiler"),
    userId: t.exposeInt("userId"),
    animeId: t.exposeInt("animeId"),
    createdAt: t.exposeString("createdAt"),
    updatedAt: t.exposeString("updatedAt"),
    parentId: t.exposeInt("parentId", { nullable: true }),
    // Add relationships
    user: t.relation("user"),
    parent: t.relation("parentComment"),
    replies: t.relation("childComments", {
      args: {
        limit: t.arg.int({ required: false, defaultValue: 10 }),
        offset: t.arg.int({ required: false, defaultValue: 0 }),
      },
      query: (args) => ({
        limit: args.limit ?? 10,
        offset: args.offset ?? 0,
        orderBy: (comments, { desc }) => [desc(comments.createdAt)],
      }),
    }),
  }),
});
