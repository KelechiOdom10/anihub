import { createServerFn } from "@tanstack/react-start";
import {
  getRequestHeaders,
  setResponseHeader,
} from "@tanstack/react-start/server";
import { env as bindings } from "cloudflare:workers";
import { env } from "void/env";
import { z } from "zod";
import { animeSchema } from "./anime";
import { createAuth } from "./auth";

const animeId = z.number().int().positive().max(2147483647);
const reviewId = z.string().min(1).max(100);

const content = {
  text: z.string().max(5000).trim().min(1).max(5000),
  rating: z.number().int().min(1).max(5),
  isSpoiler: z.boolean(),
  publishPublicly: z.literal(true),
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
  userId: z.string(),
});

function noStore() {
  setResponseHeader("Cache-Control", "no-store");
  setResponseHeader("Vary", "Cookie");
}

function author(id: string) {
  return { id, name: "Anime fan", avatar: null };
}

async function viewer() {
  noStore();

  const session = await createAuth(bindings.DB, env).api.getSession({
    headers: getRequestHeaders(),
  });

  return session ? author(session.user.id) : null;
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
      message: "This request isn't allowed. Reload and try again.",
    } as const;

  const user = await viewer();

  if (!user)
    return {
      kind: "error",
      message:
        "Your session has ended. Sign in again. Your draft is still here.",
    } as const;

  return { kind: "authorized", id: user.id } as const;
}

export const getReviewViewer = createServerFn({ method: "GET" }).handler(
  viewer
);

export const getReviews = createServerFn({ method: "GET" })
  .validator(query)
  .handler(async ({ data }) => {
    noStore();

    const result = await bindings.DB.prepare(
      `
      SELECT id, text, rating, is_spoiler AS isSpoiler,
             created_at AS createdAt, updated_at AS updatedAt, user_id AS userId
      FROM comments WHERE mal_id = ? AND parent_id IS NULL
      ORDER BY created_at DESC, id DESC LIMIT 11 OFFSET ?
    `
    )
      .bind(data.animeId, (data.page - 1) * 10)
      .all();

    const rows = z.array(row).parse(result.results);

    return {
      reviews: rows.slice(0, 10).map(({ userId, ...review }) => ({
        ...review,
        author: author(userId),
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
        message:
          "This anime is unavailable. Reload its page before publishing.",
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
          message: "This review is no longer available to edit.",
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
            "This review can't be deleted. Reviews with replies are kept to preserve the discussion, or the review is no longer yours.",
        } as const);
  });
