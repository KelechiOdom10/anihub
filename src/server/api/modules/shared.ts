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
export type TitleType = components["schemas"]["title"];
type CommonImageType = NonNullable<
  components["schemas"]["common_images"]["jpg"]
>;

export const PaginationItems =
  builder.objectRef<PaginationItemsType>("PaginationItems");
export const PaginationResult =
  builder.objectRef<PaginationResultType>("PaginationResult");

export const Title = builder.objectRef<TitleType>("AnimeTitle").implement({
  description: "Title object",
  fields: (t) => ({
    type: t.exposeString("type", { nullable: true }),
    title: t.exposeString("title", { nullable: true }),
  }),
});
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
