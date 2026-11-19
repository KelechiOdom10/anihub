import { createServerFn } from "@tanstack/react-start";
import {
  getRequestHeaders,
  setResponseHeader,
} from "@tanstack/react-start/server";
import { env as bindings } from "cloudflare:workers";
import { env } from "void/env";
import { z } from "zod";
import { publicIdentity } from "../lib/identity";
import { animeSchema } from "./anime";
import { createAuth } from "./auth";

const animeId = z.number().int().positive().max(2147483647);
const reviewId = z.string().min(1).max(100);

const content = {
  text: z.string().max(5000).trim().min(1).max(5000),
  rating: z.number().int().min(1).max(5),
  isSpoiler: z.boolean(),
};

const query = z.strictObject({
  animeId,
  page: z.number().int().min(1).max(1000).default(1),
});

const row = z.object({
  id: z.string(),
  text: z.string(),
  rating: z.number().int().min(1).max(5),
  isSpoiler: z.number().transform(Boolean),
  createdAt: z.number(),
  updatedAt: z.number(),
  likes: z.number().int(),
  commentCount: z.number().int(),
  liked: z.number().transform(Boolean),
  userId: z.string(),
  name: z.string(),
  image: z.string().nullable(),
});

function noStore() {
  setResponseHeader("Cache-Control", "no-store");
  setResponseHeader("Vary", "Cookie");
}

function author(user: { id: string; name: string; image: string | null }) {
  return {
    id: user.id,
    ...publicIdentity(user),
  };
}

async function viewer() {
  noStore();

  const session = await createAuth(bindings.DB, env).api.getSession({
    headers: getRequestHeaders(),
  });

  return session
    ? author({
        id: session.user.id,
        name: session.user.name,
        image: session.user.image ?? null,
      })
    : null;
}

async function writer() {
  noStore();

  const headers = getRequestHeaders();

  if (
    headers.get("origin") !== new URL(env.BETTER_AUTH_URL).origin ||
    headers.get("content-type")?.split(";")[0].trim() !== "application/json"
  )
    return {
      kind: "error",
      message: "Request not allowed",
    } as const;

  const user = await viewer();

  if (!user)
    return {
      kind: "error",
      message: "Sign in again",
    } as const;

  return { kind: "authorized", id: user.id } as const;
}

export const getReviewViewer = createServerFn({ method: "GET" }).handler(
  viewer
);

export const getReviews = createServerFn({ method: "GET" })
  .validator(query)
  .handler(async ({ data }) => {
    const user = await viewer();

    const result = await bindings.DB.prepare(
      `
      SELECT c.id, c.text, c.rating, c.is_spoiler AS isSpoiler,
             c.created_at AS createdAt, c.updated_at AS updatedAt,
             (SELECT count(*) FROM review_likes l WHERE l.review_id = c.id) AS likes,
             (SELECT count(*) FROM review_comments rc WHERE rc.review_id = c.id) AS commentCount,
             EXISTS (SELECT 1 FROM review_likes l WHERE l.review_id = c.id AND l.user_id = ?) AS liked,
             c.user_id AS userId, u.name, u.image
      FROM comments c JOIN user u ON u.id = c.user_id
      WHERE c.mal_id = ? AND c.parent_id IS NULL
      ORDER BY c.created_at DESC, c.id DESC LIMIT 11 OFFSET ?
    `
    )
      .bind(user?.id ?? "", data.animeId, (data.page - 1) * 10)
      .all();

    const rows = z.array(row).parse(result.results);

    return {
      reviews: rows.slice(0, 10).map(({ userId, name, image, ...review }) => ({
        ...review,
        author: author({ id: userId, name, image }),
      })),
      hasNextPage: rows.length > 10 && data.page < 1000,
    };
  });

export type Review = Awaited<ReturnType<typeof getReviews>>["reviews"][number];

export const createReview = createServerFn({ method: "POST" })
  .validator(z.strictObject({ animeId, ...content }))
  .handler(async ({ data }) => {
    const user = await writer();

    if (user.kind === "error") return user;

    const cached = await bindings.DB.prepare(
      "SELECT data FROM cache_entries WHERE key = ?"
    )
      .bind(`mal:anime:${data.animeId}`)
      .first("data");

    const parsed = z.string().safeParse(cached);
    let metadata = null;

    if (parsed.success) {
      try {
        metadata = animeSchema.safeParse(JSON.parse(parsed.data));
      } catch {
        metadata = null;
      }
    }

    if (!metadata?.success || metadata.data.id !== data.animeId)
      return {
        kind: "error",
        message: "Anime unavailable",
      } as const;

    const id = crypto.randomUUID();
    const now = Date.now();

    await bindings.DB.prepare(
      `
      INSERT INTO comments (id, text, rating, is_spoiler, user_id, mal_id, parent_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?)
    `
    )
      .bind(
        id,
        data.text,
        data.rating,
        Number(data.isSpoiler),
        user.id,
        data.animeId,
        now,
        now
      )
      .run();

    return { kind: "saved", id } as const;
  });

export const editReview = createServerFn({ method: "POST" })
  .validator(z.strictObject({ id: reviewId, ...content }))
  .handler(async ({ data }) => {
    const user = await writer();

    if (user.kind === "error") return user;

    const result = await bindings.DB.prepare(
      `
      UPDATE comments SET text = ?, rating = ?, is_spoiler = ?, updated_at = ?
      WHERE id = ? AND user_id = ? AND parent_id IS NULL
    `
    )
      .bind(
        data.text,
        data.rating,
        Number(data.isSpoiler),
        Date.now(),
        data.id,
        user.id
      )
      .run();

    return result.meta.changes
      ? ({ kind: "saved", id: data.id } as const)
      : ({
          kind: "error",
          message: "Review unavailable",
        } as const);
  });

export const deleteReview = createServerFn({ method: "POST" })
  .validator(z.strictObject({ id: reviewId }))
  .handler(async ({ data }) => {
    const user = await writer();

    if (user.kind === "error") return user;

    const result = await bindings.DB.prepare(
      `
      DELETE FROM comments WHERE id = ? AND user_id = ? AND parent_id IS NULL
      AND NOT EXISTS (SELECT 1 FROM comments AS replies WHERE replies.parent_id = comments.id)
    `
    )
      .bind(data.id, user.id)
      .run();

    return result.meta.changes
      ? ({ kind: "saved", id: data.id } as const)
      : ({
          kind: "error",
          message:
            "Can't delete this review. It has replies or is no longer available.",
        } as const);
  });

const commentRow = z.object({
  id: z.string(),
  text: z.string(),
  createdAt: z.number(),
  userId: z.string(),
  name: z.string(),
  image: z.string().nullable(),
});

export const likeReview = createServerFn({ method: "POST" })
  .validator(z.strictObject({ id: reviewId, liked: z.boolean() }))
  .handler(async ({ data }) => {
    const user = await writer();

    if (user.kind === "error") return user;

    if (data.liked)
      await bindings.DB.prepare(
        `
        INSERT INTO review_likes (id, review_id, user_id, created_at)
        SELECT ?, c.id, ?, ? FROM comments c
        WHERE c.id = ? AND c.parent_id IS NULL AND c.user_id != ?
        ON CONFLICT (review_id, user_id) DO NOTHING
      `
      )
        .bind(crypto.randomUUID(), user.id, Date.now(), data.id, user.id)
        .run();
    else
      await bindings.DB.prepare(
        "DELETE FROM review_likes WHERE review_id = ? AND user_id = ?"
      )
        .bind(data.id, user.id)
        .run();

    const state = z
      .object({
        likes: z.number().int(),
        liked: z.number().transform(Boolean),
      })
      .nullable()
      .parse(
        await bindings.DB.prepare(
          `
          SELECT (SELECT count(*) FROM review_likes l WHERE l.review_id = c.id) AS likes,
                 EXISTS (SELECT 1 FROM review_likes l WHERE l.review_id = c.id AND l.user_id = ?) AS liked
          FROM comments c WHERE c.id = ? AND c.parent_id IS NULL
        `
        )
          .bind(user.id, data.id)
          .first()
      );

    return state
      ? ({ kind: "saved", ...state } as const)
      : ({ kind: "error", message: "Review unavailable" } as const);
  });

export const getReviewComments = createServerFn({ method: "GET" })
  .validator(z.strictObject({ reviewId }))
  .handler(async ({ data }) => {
    noStore();

    const result = await bindings.DB.prepare(
      `
      SELECT rc.id, rc.text, rc.created_at AS createdAt, rc.user_id AS userId, u.name, u.image
      FROM review_comments rc JOIN user u ON u.id = rc.user_id
      WHERE rc.review_id = ?
      ORDER BY rc.created_at, rc.id LIMIT 200
    `
    )
      .bind(data.reviewId)
      .all();

    return z
      .array(commentRow)
      .parse(result.results)
      .map(({ userId, name, image, ...comment }) => ({
        ...comment,
        author: author({ id: userId, name, image }),
      }));
  });

export type ReviewComment = Awaited<
  ReturnType<typeof getReviewComments>
>[number];

export const createReviewComment = createServerFn({ method: "POST" })
  .validator(
    z.strictObject({
      reviewId,
      text: z.string().max(1000).trim().min(1).max(1000),
    })
  )
  .handler(async ({ data }) => {
    const user = await writer();

    if (user.kind === "error") return user;

    const id = crypto.randomUUID();
    const now = Date.now();

    const result = await bindings.DB.prepare(
      `
      INSERT INTO review_comments (id, review_id, user_id, text, created_at, updated_at)
      SELECT ?, c.id, ?, ?, ?, ? FROM comments c WHERE c.id = ? AND c.parent_id IS NULL
    `
    )
      .bind(id, user.id, data.text, now, now, data.reviewId)
      .run();

    return result.meta.changes
      ? ({ kind: "saved", id } as const)
      : ({ kind: "error", message: "Review unavailable" } as const);
  });

export const deleteReviewComment = createServerFn({ method: "POST" })
  .validator(z.strictObject({ id: reviewId }))
  .handler(async ({ data }) => {
    const user = await writer();

    if (user.kind === "error") return user;

    const result = await bindings.DB.prepare(
      `
      DELETE FROM review_comments WHERE id = ? AND (
        user_id = ? OR review_id IN (SELECT id FROM comments WHERE user_id = ? AND parent_id IS NULL)
      )
    `
    )
      .bind(data.id, user.id, user.id)
      .run();

    return result.meta.changes
      ? ({ kind: "saved", id: data.id } as const)
      : ({ kind: "error", message: "Comment unavailable" } as const);
  });
