import { and, eq, isNull } from "drizzle-orm";

import { Comment } from "./comment.model";

import { builder } from "../../builder";

import { comments } from "~/server/db/schema/comment";

const CommentInput = builder.inputType("CommentInput", {
  fields: (t) => ({
    text: t.string({ required: true }),
    rating: t.int({
      required: true,
      validate: {
        min: 1,
        max: 5,
      },
    }),
    isSpoiler: t.boolean({ required: true }),
    animeId: t.int({ required: true }),
    parentId: t.int({ required: false }),
  }),
});

builder.queryField("animeComments", (t) =>
  t.drizzleField({
    type: [Comment],
    args: {
      animeId: t.arg.int({ required: true }),
    },
    resolve: (query, _root, { animeId }, ctx) =>
      ctx.db.query.comments.findMany(
        query({
          where: and(eq(comments.animeId, animeId), isNull(comments.parentId)),
          orderBy: (comments, { desc }) => [desc(comments.createdAt)],
        })
      ),
  })
);

// Mutations
builder.mutationField("createComment", (t) =>
  t.field({
    type: Comment,
    args: {
      input: t.arg({ type: CommentInput, required: true }),
    },
    resolve: async (_, { input }, { db, session }) => {
      if (!session?.userId) {
        throw new Error("You must be logged in to comment");
      }

      const [comment] = await db
        .insert(comments)
        .values({
          ...input,
          userId: session.userId,
        })
        .returning();

      return comment;
    },
  })
);

builder.mutationField("updateComment", (t) =>
  t.field({
    type: Comment,
    args: {
      id: t.arg.int({ required: true }),
      input: t.arg({ type: CommentInput, required: true }),
    },
    resolve: async (_, { id, input }, { db, session }) => {
      if (!session) {
        throw new Error("You must be logged in to update a comment");
      }

      const comment = await db.query.comments.findFirst({
        where: (comments, { eq }) => eq(comments.id, id),
      });

      if (!comment) {
        throw new Error("Comment not found");
      }

      if (comment.userId !== session?.userId) {
        throw new Error("You can only update your own comments");
      }

      const [updatedComment] = await db
        .update(comments)
        .set({
          ...input,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(comments.id, id))
        .returning();

      return updatedComment;
    },
  })
);

builder.mutationField("deleteComment", (t) =>
  t.field({
    type: Comment,
    args: {
      id: t.arg.int({ required: true }),
    },
    resolve: async (_, { id }, { db, session }) => {
      if (!session) {
        throw new Error("You must be logged in to delete a comment");
      }

      const comment = await db.query.comments.findFirst({
        where: (comments, { eq }) => eq(comments.id, id),
      });

      if (!comment) {
        throw new Error("Comment not found");
      }

      if (comment.userId !== session?.userId) {
        throw new Error("You can only delete your own comments");
      }

      const [deletedComment] = await db
        .delete(comments)
        .where(eq(comments.id, id))
        .returning();

      return deletedComment;
    },
  })
);
