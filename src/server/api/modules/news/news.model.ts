import { builder } from "../../builder";

import { type components } from "~/server/jikan-schema";

type NewsType = NonNullable<components["schemas"]["news"]["data"]>[number];

export const News = builder.objectRef<NewsType>("News");

builder.objectType(News, {
  description: "News object",
  fields: (t) => ({
    id: t.exposeID("mal_id", {
      description: "The ID of the news",
      nullable: true,
    }),
    author: t.exposeString("author_username", {
      description: "The author of the news",
      nullable: true,
    }),
    authorUrl: t.exposeString("author_url", {
      description: "The URL of the author",
      nullable: true,
    }),
    title: t.exposeString("title", {
      description: "The title of the news",
      nullable: true,
    }),
    url: t.exposeString("url", {
      description: "The URL of the news",
      nullable: true,
    }),
    forumUrl: t.exposeString("forum_url", {
      description: "The URL of the forum",
      nullable: true,
    }),
    comments: t.exposeInt("comments", {
      description: "The number of comments",
      nullable: true,
    }),
    excerpt: t.exposeString("excerpt", {
      description: "The excerpt of the news",
      nullable: true,
    }),
  }),
});
