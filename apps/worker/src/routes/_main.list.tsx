import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_main/list")({
  beforeLoad: ({ context }) => {
    if (!context.viewer)
      throw redirect({ to: "/sign-in", search: { redirect: "/list" } });

    throw redirect({
      to: "/users/$userId",
      params: { userId: context.viewer.id },
      search: { tab: "watching", page: 1 },
    });
  },
});
