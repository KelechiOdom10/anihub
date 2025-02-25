import { and } from "drizzle-orm";

import { animeService } from "./anime.service";

import { builder } from "../../builder";
import { Character } from "../character";
import { Comment } from "../comment/comment.model";
import { Genre } from "../genre";
import { PaginationResult, Title } from "../shared";

import { type components } from "~/server/jikan-schema";

type AnimeType = components["schemas"]["anime"];
type AiredType = NonNullable<components["schemas"]["anime"]["aired"]>;
type TrailerType = NonNullable<components["schemas"]["anime"]["trailer"]>;
type MetadataType = components["schemas"]["mal_url"];
type ImageType = NonNullable<components["schemas"]["anime_images"]["jpg"]>;
type AnimeSearchResultType = components["schemas"]["anime_search"];

export const Anime = builder.objectRef<AnimeType>("Anime");

const AnimeImage = builder.objectRef<ImageType>("AnimeImage").implement({
  description: "Anime Image object",
  fields: (t) => ({
    small: t.exposeString("small_image_url", { nullable: true }),
    default: t.exposeString("image_url", { nullable: true }),
    large: t.exposeString("large_image_url", { nullable: true }),
  }),
});

const Aired = builder.objectRef<AiredType>("Aired").implement({
  description: "Aired object",
  fields: (t) => ({
    from: t.exposeString("from", { nullable: true }),
    to: t.exposeString("to", { nullable: true }),
  }),
});

const Trailer = builder.objectRef<TrailerType>("Trailer").implement({
  description: "Trailer object",
  fields: (t) => ({
    id: t.exposeString("youtube_id", { nullable: true }),
    url: t.exposeString("url", { nullable: true }),
    embedUrl: t.exposeString("embed_url", { nullable: true }),
  }),
});

const Metadata = builder.objectRef<MetadataType>("Metadata").implement({
  description: "Metadata object",
  fields: (t) => ({
    type: t.exposeString("type", { nullable: true }),
    name: t.exposeString("name", { nullable: true }),
    url: t.exposeString("url", { nullable: true }),
  }),
});

builder.objectType(Anime, {
  description: "Anime object",
  fields: (t) => ({
    id: t.exposeID("mal_id", {
      description: "The ID of the anime",
      nullable: true,
    }),
    synopsis: t.exposeString("synopsis", {
      description: "The description of the anime",
      nullable: true,
    }),
    description: t.exposeString("synopsis", {
      description: "The description of the anime",
      nullable: true,
    }),
    type: t.exposeString("type", {
      description: "The type of the anime",
      nullable: true,
    }),
    episodes: t.exposeInt("episodes", {
      description: "The number of episodes of the anime",
      nullable: true,
    }),
    score: t.exposeFloat("score", {
      description: "The average score of the anime",
      nullable: true,
    }),
    status: t.exposeString("status", {
      description: "The status of the anime",
      nullable: true,
    }),
    airing: t.exposeBoolean("airing", {
      description: "Whether the anime is currently airing",
      nullable: true,
    }),
    rating: t.exposeString("rating", {
      description: "The rating of the anime",
      nullable: true,
    }),
    rank: t.exposeInt("rank", {
      description: "The rank of the anime",
      nullable: true,
    }),
    popularity: t.exposeInt("popularity", {
      description: "The popularity of the anime",
      nullable: true,
    }),
    source: t.exposeString("source", { nullable: true }),
    background: t.exposeString("background", {
      description: "The background information of the anime",
      nullable: true,
    }),
    season: t.exposeString("season", {
      description: "The season the anime aired",
      nullable: true,
    }),
    year: t.exposeInt("year", {
      description: "The year the anime aired",
      nullable: true,
    }),
    duration: t.exposeString("duration", {
      description: "The duration of each episode of the anime",
      nullable: true,
    }),
    aired: t.field({
      description: "The dates the anime aired",
      type: Aired,
      nullable: true,
      resolve: (parent) => parent.aired,
    }),
    genres: t.field({
      type: [Genre],
      description: "The genres of the anime (e.g. Action, Comedy)",
      nullable: true,
      resolve: (parent) => parent.genres,
    }),
    producers: t.field({
      description: "The producers of the anime",
      type: [Metadata],
      nullable: true,
      resolve: (parent) => parent.producers,
    }),
    studios: t.field({
      description: "The studios that produced the anime",
      type: [Metadata],
      nullable: true,
      resolve: (parent) => parent.studios,
    }),
    trailer: t.field({
      description: "The trailer of the anime (if available on YouTube)",
      type: Trailer,
      nullable: true,
      resolve: (parent) => parent.trailer,
    }),
    titles: t.field({
      description: "The titles of the anime in different languages",
      type: [Title],
      nullable: true,
      resolve: (parent) => parent.titles,
    }),
    title: t.exposeString("title_english", {
      description: "The title of the anime",
      nullable: true,
    }),
    image: t.field({
      description: "The images of the anime",
      type: AnimeImage,
      nullable: true,
      resolve: (parent) => parent.images?.jpg ?? parent.images?.webp,
    }),
    characters: t.field({
      description: "The characters of the anime",
      type: [Character],
      nullable: true,
      resolve: async (parent) => {
        if (!parent.mal_id) return null;

        const { data } = await animeService.GET("/anime/{id}/characters", {
          params: {
            path: { id: parent.mal_id },
          },
        });
        if (!data?.data) return [];

        return data.data.map((character) => ({
          ...character.character,
        }));
      },
    }),
    comments: t.field({
      type: [Comment],
      resolve: async (parent, _, { db }) => {
        const animeId = parent.mal_id;
        if (!animeId) return [];

        return db.query.comments.findMany({
          where: (comments, { eq, isNull }) =>
            and(eq(comments.animeId, animeId), isNull(comments.parentId)),
          orderBy: (comments, { desc }) => [desc(comments.createdAt)],
        });
      },
    }),
  }),
});

export const AnimeSearchResult =
  builder.objectRef<AnimeSearchResultType>("AnimeSearchResult");

builder.objectType(AnimeSearchResult, {
  description: "Anime search result object",
  fields: (t) => ({
    data: t.field({
      type: [Anime],
      description: "The list of anime",
      nullable: true,
      resolve: (parent) => parent.data,
    }),
    pagination: t.field({
      type: PaginationResult,
      description: "The pagination information",
      nullable: true,
      resolve: (parent) => {
        return {
          has_next_page: parent.pagination?.has_next_page,
          last_visible_page: parent.pagination?.last_visible_page,
          items: {
            count: parent.pagination?.items?.count,
            total: parent.pagination?.items?.total,
            per_page: parent.pagination?.items?.per_page,
          },
        };
      },
    }),
  }),
});
