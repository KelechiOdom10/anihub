import { protectedProcedure, createTRPCRouter, publicProcedure } from "../trpc";

export const userRouter = createTRPCRouter({
  get: protectedProcedure.query(({ ctx }) => ctx.user),
  isUserLoggedIn: publicProcedure.query(({ ctx }) => Boolean(ctx.session)),
});
