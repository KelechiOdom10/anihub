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

const pageSchema = z.number().int().min(1).max(1000).default(1);
const animeIdSchema = z.number().int().positive().max(2147483647);
const listIdSchema = z.string().min(1).max(100);
const libraryQuery = z.strictObject({ page: pageSchema });

const itemQuery = z.strictObject({
  collectionId: listIdSchema,
  page: pageSchema,
});

const createInput = z.strictObject({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).default(""),
  animeId: animeIdSchema.optional(),
  animeIds: z.array(animeIdSchema).max(50).default([]),
  isPublic: z.boolean().default(false),
});

const publicCollectionQuery = z.strictObject({
  id: listIdSchema,
  page: pageSchema,
});

const publicCollectionsQuery = z.strictObject({
  userId: z.string().min(1).max(100),
  page: pageSchema,
});

const visibilityInput = z.strictObject({
  id: listIdSchema,
  isPublic: z.boolean(),
});

const membershipQuery = z.strictObject({
  animeId: animeIdSchema,
  page: pageSchema,
});

const membershipInput = z
  .strictObject({
    animeId: animeIdSchema,
    add: z.array(listIdSchema).max(50).default([]),
    remove: z.array(listIdSchema).max(50).default([]),
  })
  .refine(({ add, remove }) => {
    const ids = [...add, ...remove];

    return (
      ids.length > 0 && ids.length <= 50 && new Set(ids).size === ids.length
    );
  }, "Choose up to 50 collections, each once.");

const collectionRow = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  isPublic: z.number().transform(Boolean),
});

const membershipRow = z.object({
  id: z.string(),
  name: z.string(),
  totalItems: z.number(),
  hasAnime: z.number().transform(Boolean),
  malId: z.number().nullable(),
  animeImage: z.string().nullable(),
  data: z.string().nullable(),
});

const publicCollectionRow = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  ownerId: z.string(),
  ownerName: z.string(),
  ownerImage: z.string().nullable(),
});

const ownerRow = z.object({
  id: z.string(),
  name: z.string(),
  image: z.string().nullable(),
});

const summaryRow = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
});

const itemRow = z.object({
  id: z.string(),
  malId: z.number().nullable(),
  animeImage: z.string().nullable(),
  data: z.string().nullable(),
});

const cachedAnime = z
  .string()
  .transform((value) => {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  })
  .pipe(animeSchema);

async function owner() {
  setResponseHeader("Cache-Control", "private, no-store");
  setResponseHeader("Vary", "Cookie");

  const session = await createAuth(bindings.DB, env).api.getSession({
    headers: getRequestHeaders(),
  });

  return session?.user.id ?? null;
}

function rejectedRequest() {
  const headers = getRequestHeaders();

  return (
    headers.get("origin") !== new URL(env.BETTER_AUTH_URL).origin ||
    !headers.get("content-type")?.startsWith("application/json")
  );
}

async function savedCover(animeId: number) {
  const cached = await bindings.DB.prepare(
    "SELECT data FROM cache_entries WHERE key = ?"
  )
    .bind(`mal:anime:${animeId}`)
    .first("data");

  const anime = cachedAnime.safeParse(cached);

  return anime.success && anime.data.id === animeId
    ? cover(anime.data.coverImage.extraLarge)
    : null;
}

async function savedCovers(animeIds: number[]) {
  if (!animeIds.length) return new Map<number, string>();

  const result = await bindings.DB.prepare(
    `SELECT key, data FROM cache_entries WHERE key IN (${animeIds
      .map(() => "?")
      .join(", ")})`
  )
    .bind(...animeIds.map((animeId) => `mal:anime:${animeId}`))
    .all();

  const rows = z
    .array(z.object({ key: z.string(), data: z.string() }))
    .parse(result.results);

  const covers = new Map<number, string>();

  for (const row of rows) {
    const animeId = Number(row.key.slice("mal:anime:".length));
    const anime = cachedAnime.safeParse(row.data);

    if (anime.success && anime.data.id === animeId)
      covers.set(animeId, cover(anime.data.coverImage.extraLarge));
  }

  return covers.size === animeIds.length ? covers : null;
}

function cover(value: string | null) {
  if (value === "/fallback-anime.avif") return value;

  const parsed = z.url().safeParse(value);

  if (!parsed.success) return "/fallback-anime.avif";

  const url = new URL(parsed.data);

  return url.protocol === "https:" && url.hostname === "cdn.myanimelist.net"
    ? url.href
    : "/fallback-anime.avif";
}

function itemDto(row: z.infer<typeof itemRow>) {
  const parsed = cachedAnime.safeParse(row.data);

  const anime =
    parsed.success && parsed.data.id === row.malId ? parsed.data : null;

  return {
    id: row.id,
    animeId: anime?.id ?? null,
    title: anime
      ? anime.title.english || anime.title.romaji
      : "Anime unavailable",
    image: cover(anime?.coverImage.extraLarge ?? row.animeImage),
  };
}

function itemStatement(userId: string, query: z.infer<typeof itemQuery>) {
  return bindings.DB.prepare(
    `
    SELECT i.id, i.mal_id AS malId, i.anime_image AS animeImage, c.data
    FROM collection_items i
    JOIN collections l ON l.id = i.collection_id AND l.user_id = ?
    LEFT JOIN cache_entries c ON c.key = 'mal:anime:' || i.mal_id
    WHERE i.collection_id = ?
    ORDER BY i.added_at DESC, i.id DESC LIMIT 13 OFFSET ?
  `
  ).bind(userId, query.collectionId, (query.page - 1) * 12);
}

function itemPage(result: D1Result) {
  const rows = z.array(itemRow).parse(result.results);

  return {
    items: rows.slice(0, 12).map(itemDto),
    hasNextPage: rows.length > 12,
  };
}

export const getLibraryItems = createServerFn({ method: "GET" })
  .validator(itemQuery)
  .handler(async ({ data }) => {
    const userId = await owner();

    if (!userId) return null;

    return itemPage(await itemStatement(userId, data).all());
  });

export const getLibrary = createServerFn({ method: "GET" })
  .validator(libraryQuery)
  .handler(async ({ data }) => {
    const userId = await owner();

    if (!userId) return null;

    const result = await bindings.DB.prepare(
      `
      SELECT id, name, description, is_public AS isPublic FROM collections
      WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 11 OFFSET ?
    `
    )
      .bind(userId, (data.page - 1) * 10)
      .all();

    const rows = z.array(collectionRow).parse(result.results);
    const visible = rows.slice(0, 10);

    const pages = visible.length
      ? await bindings.DB.batch(
          visible.map((row) =>
            itemStatement(userId, { collectionId: row.id, page: 1 })
          )
        )
      : [];

    const collections = visible.map((row, index) => ({
      ...row,
      ...itemPage(pages[index]),
    }));

    return { collections, hasNextPage: rows.length > 10 };
  });

export const createCollection = createServerFn({ method: "POST" })
  .validator(createInput)
  .handler(async ({ data }) => {
    const userId = await owner();

    if (rejectedRequest())
      return {
        kind: "error",
        message: "Request not allowed",
      } as const;

    if (!userId)
      return {
        kind: "signed-out",
        message: "Sign in again",
      } as const;

    const animeIds = [
      ...new Set([
        ...(data.animeId === undefined ? [] : [data.animeId]),
        ...data.animeIds,
      ]),
    ];

    const covers = await savedCovers(animeIds);

    if (!covers)
      return {
        kind: "error",
        message: "Anime unavailable",
      } as const;

    const id = crypto.randomUUID();
    const now = Date.now();

    const statements = [
      bindings.DB.prepare(
        `
      INSERT INTO collections (id, name, description, user_id, is_public, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `
      ).bind(
        id,
        data.name,
        data.description || null,
        userId,
        data.isPublic ? 1 : 0,
        now,
        now
      ),
      ...animeIds.map((animeId) =>
        bindings.DB.prepare(
          `
        INSERT INTO collection_items (id, collection_id, mal_id, anime_image, added_at)
        VALUES (?, ?, ?, ?, ?)
      `
        ).bind(crypto.randomUUID(), id, animeId, covers.get(animeId), now)
      ),
    ];

    try {
      await bindings.DB.batch(statements);
    } catch {
      return {
        kind: "error",
        message: "Couldn't create collection",
      } as const;
    }

    return {
      kind: "created",
      collection: {
        id,
        name: data.name,
        description: data.description || null,
        isPublic: data.isPublic,
      },
    } as const;
  });

export const getMembership = createServerFn({ method: "GET" })
  .validator(membershipQuery)
  .handler(async ({ data }) => {
    const userId = await owner();

    if (!userId) return null;

    const result = await bindings.DB.prepare(
      `
      SELECT
        l.id,
        l.name,
        (SELECT count(*) FROM collection_items WHERE collection_id = l.id) AS totalItems,
        EXISTS (
          SELECT 1 FROM collection_items WHERE collection_id = l.id AND mal_id = ?
        ) AS hasAnime,
        t.mal_id AS malId,
        t.anime_image AS animeImage,
        c.data
      FROM collections l
      LEFT JOIN collection_items t ON t.id = (
        SELECT id FROM collection_items WHERE collection_id = l.id
        ORDER BY added_at DESC, id DESC LIMIT 1
      )
      LEFT JOIN cache_entries c ON c.key = 'mal:anime:' || t.mal_id
      WHERE l.user_id = ?
      ORDER BY l.created_at DESC, l.id DESC LIMIT 21 OFFSET ?
    `
    )
      .bind(data.animeId, userId, (data.page - 1) * 20)
      .all();

    const rows = z.array(membershipRow).parse(result.results);

    return {
      collections: rows.slice(0, 20).map((row) => ({
        id: row.id,
        name: row.name,
        totalItems: row.totalItems,
        hasAnime: row.hasAnime,
        thumbnail: row.totalItems ? itemDto(row).image : null,
      })),
      hasNextPage: rows.length > 20,
    };
  });

export const setMembership = createServerFn({ method: "POST" })
  .validator(membershipInput)
  .handler(async ({ data }) => {
    const userId = await owner();

    if (rejectedRequest())
      return {
        kind: "error",
        message: "Request not allowed",
      } as const;

    if (!userId)
      return {
        kind: "signed-out",
        message: "Sign in again",
      } as const;

    const ids = [...data.add, ...data.remove];

    const owned = await bindings.DB.prepare(
      `SELECT count(*) AS n FROM collections WHERE user_id = ? AND id IN (${ids
        .map(() => "?")
        .join(", ")})`
    )
      .bind(userId, ...ids)
      .first("n");

    if (owned !== ids.length)
      return {
        kind: "error",
        message: "Collection unavailable",
      } as const;

    const image = data.add.length ? await savedCover(data.animeId) : null;

    if (data.add.length && !image)
      return {
        kind: "error",
        message: "Anime unavailable",
      } as const;

    const now = Date.now();

    const statements = [
      ...data.add.map((collectionId) =>
        bindings.DB.prepare(
          `
          INSERT INTO collection_items (id, collection_id, mal_id, anime_image, added_at)
          SELECT ?, id, ?, ?, ? FROM collections WHERE id = ? AND user_id = ?
          ON CONFLICT (collection_id, mal_id) DO NOTHING
        `
        ).bind(
          crypto.randomUUID(),
          data.animeId,
          image,
          now,
          collectionId,
          userId
        )
      ),
      ...data.remove.map((collectionId) =>
        bindings.DB.prepare(
          `
          DELETE FROM collection_items
          WHERE mal_id = ? AND collection_id = (
            SELECT id FROM collections WHERE id = ? AND user_id = ?
          )
        `
        ).bind(data.animeId, collectionId, userId)
      ),
    ];

    try {
      const results = await bindings.DB.batch(statements);

      return {
        kind: "saved",
        changed: results.filter((result) => result.meta.changes > 0).length,
      } as const;
    } catch {
      return {
        kind: "error",
        message: "Couldn't update collections",
      } as const;
    }
  });

function publicItemStatement(collectionId: string, page: number) {
  return bindings.DB.prepare(
    `
    SELECT i.id, i.mal_id AS malId, i.anime_image AS animeImage, c.data
    FROM collection_items i
    LEFT JOIN cache_entries c ON c.key = 'mal:anime:' || i.mal_id
    WHERE i.collection_id = ?
    ORDER BY i.added_at DESC, i.id DESC LIMIT 13 OFFSET ?
  `
  ).bind(collectionId, (page - 1) * 12);
}

export const setCollectionVisibility = createServerFn({ method: "POST" })
  .validator(visibilityInput)
  .handler(async ({ data }) => {
    const userId = await owner();

    if (rejectedRequest())
      return {
        kind: "error",
        message: "This request isn't allowed. Reload and try again.",
      } as const;

    if (!userId)
      return {
        kind: "signed-out",
        message: "Your session has ended. Sign in again to change this.",
      } as const;

    const result = await bindings.DB.prepare(
      `
      UPDATE collections SET is_public = ?, updated_at = ?
      WHERE id = ? AND user_id = ?
    `
    )
      .bind(data.isPublic ? 1 : 0, Date.now(), data.id, userId)
      .run();

    if (result.meta.changes !== 1)
      return {
        kind: "error",
        message:
          "This collection is no longer available. Reload and try again.",
      } as const;

    return { kind: "saved", isPublic: data.isPublic } as const;
  });

export const getPublicCollection = createServerFn({ method: "GET" })
  .validator(publicCollectionQuery)
  .handler(async ({ data }) => {
    setResponseHeader("Cache-Control", "public, max-age=60");

    const row = await bindings.DB.prepare(
      `
      SELECT
        l.id, l.name, l.description,
        u.id AS ownerId, u.name AS ownerName, u.image AS ownerImage
      FROM collections l
      JOIN user u ON u.id = l.user_id
      WHERE l.id = ? AND l.is_public = 1
    `
    )
      .bind(data.id)
      .first();

    if (!row) return null;

    const items = itemPage(await publicItemStatement(data.id, data.page).all());
    const found = publicCollectionRow.parse(row);

    return {
      collection: {
        id: found.id,
        name: found.name,
        description: found.description,
        ownerId: found.ownerId,
        owner: publicIdentity({
          name: found.ownerName,
          image: found.ownerImage,
        }),
      },
      ...items,
    };
  });

export const getPublicCollections = createServerFn({ method: "GET" })
  .validator(publicCollectionsQuery)
  .handler(async ({ data }) => {
    setResponseHeader("Cache-Control", "public, max-age=60");

    const found = await bindings.DB.prepare(
      "SELECT id, name, image FROM user WHERE id = ?"
    )
      .bind(data.userId)
      .first();

    if (!found) return null;

    const result = await bindings.DB.prepare(
      `
      SELECT id, name, description FROM collections
      WHERE user_id = ? AND is_public = 1
      ORDER BY created_at DESC, id DESC LIMIT 11 OFFSET ?
    `
    )
      .bind(data.userId, (data.page - 1) * 10)
      .all();

    const rows = z.array(summaryRow).parse(result.results);
    const visible = rows.slice(0, 10);

    const pages = visible.length
      ? await bindings.DB.batch(
          visible.map((row) => publicItemStatement(row.id, 1))
        )
      : [];

    const account = ownerRow.parse(found);

    return {
      owner: {
        id: account.id,
        ...publicIdentity(account),
      },
      collections: visible.map((row, index) => ({
        ...row,
        ...itemPage(pages[index]),
      })),
      hasNextPage: rows.length > 10,
    };
  });
