import { builder } from "../builder";

type PaginationItemsType = {
  count?: number;
  total?: number;
  per_page?: number;
};
type PaginationResultType = {
  last_visible_page?: number;
  has_next_page?: boolean;
  items: PaginationItemsType;
};

export const PaginationItems =
  builder.objectRef<PaginationItemsType>("PaginationItems");
export const PaginationResult =
  builder.objectRef<PaginationResultType>("PaginationResult");

builder.objectType(PaginationItems, {
  fields: (t) => ({
    count: t.exposeInt("count", { nullable: true }),
    total: t.exposeInt("total", { nullable: true }),
    perPage: t.exposeInt("per_page", { nullable: true }),
  }),
});

builder.objectType(PaginationResult, {
  fields: (t) => ({
    lastVisiblePage: t.exposeInt("last_visible_page", { nullable: true }),
    hasNextPage: t.exposeBoolean("has_next_page", { nullable: true }),
    items: t.field({
      type: PaginationItems,
      resolve: (parent) => parent?.items,
    }),
  }),
});
