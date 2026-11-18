import { z } from "zod";
import type { Anime } from "../src/server/anime";
import { normalizedEmail } from "../src/server/email";

const integerId = z.number().int().nonnegative();
const stamp = z.string().min(1);
const flag = z.number().int().min(0).max(1);

export const legacySchema = z.object({
  users: z.array(
    z.object({
      id: integerId,
      email: z.string(),
      email_verified: flag,
      username: z.string(),
      avatar: z.string().nullable(),
      created_at: stamp,
      updated_at: stamp,
    })
  ),
  collections: z.array(
    z.object({
      id: integerId,
      name: z.string(),
      description: z.string().nullable(),
      user_id: integerId,
      is_public: flag,
      likes_count: z.number().int().nonnegative(),
      created_at: stamp,
      updated_at: stamp,
    })
  ),
  items: z.array(
    z.object({
      id: integerId,
      collection_id: integerId,
      anime_id: integerId,
      anime_image: z.string().nullable(),
      added_at: stamp,
    })
  ),
  likes: z.array(
    z.object({
      id: integerId,
      collection_id: integerId,
      user_id: integerId,
      created_at: stamp,
    })
  ),
  comments: z.array(
    z.object({
      id: integerId,
      text: z.string(),
      rating: z.number().int(),
      is_spoiler: flag,
      user_id: integerId,
      anime_id: integerId,
      parent_id: integerId.nullable(),
      created_at: stamp,
      updated_at: stamp,
    })
  ),
});

export type LegacyData = z.infer<typeof legacySchema>;

const legacyTimestamp = stamp
  .transform((value) =>
    Date.parse(value.includes("T") ? value : value.replace(" ", "T") + "Z")
  )
  .pipe(z.number().int());

function quote(value: string) {
  return "'" + value.replaceAll("'", "''") + "'";
}

function optional(value: string | null) {
  return value === null ? "NULL" : quote(value);
}

function integer(value: number | null | undefined) {
  return value === null || value === undefined ? "NULL" : String(value);
}

function insert(table: string, values: Record<string, string>) {
  const columns = Object.keys(values)
    .map((key) => '"' + key + '"')
    .join(", ");

  return `INSERT INTO "${table}" (${columns}) VALUES (${Object.values(values).join(", ")});`;
}

function time(value: string) {
  return String(legacyTimestamp.parse(value));
}

export function buildImportStatements(
  data: LegacyData,
  media: Anime[],
  importedAt: number
) {
  const emails = new Set<string>();
  const statements = ["PRAGMA defer_foreign_keys = ON;"];

  for (const value of data.users) {
    const normalized = normalizedEmail.parse(value.email);

    if (emails.has(normalized))
      throw new Error(
        "Legacy users have a normalized email collision; reconcile before importing"
      );

    emails.add(normalized);
    statements.push(
      insert("user", {
        id: quote(String(value.id)),
        name: quote(value.username),
        email: quote(normalized),
        email_verified: integer(value.email_verified),
        username: quote(value.username),
        image: optional(value.avatar),
        created_at: time(value.created_at),
        updated_at: time(value.updated_at),
      })
    );
  }

  const byMalId = new Map(
    media.flatMap((value) =>
      value.idMal === null ? [] : [[value.idMal, value.id] as const]
    )
  );

  for (const value of media)
    statements.push(
      insert("anime_cache", {
        id: integer(value.id),
        mal_id: integer(value.idMal),
        data: quote(JSON.stringify(value)),
        updated_at: integer(importedAt),
      })
    );

  for (const value of data.collections)
    statements.push(
      insert("collections", {
        id: quote(String(value.id)),
        name: quote(value.name),
        description: optional(value.description),
        user_id: quote(String(value.user_id)),
        is_public: integer(value.is_public),
        likes_count: integer(value.likes_count),
        created_at: time(value.created_at),
        updated_at: time(value.updated_at),
      })
    );

  for (const value of data.items)
    statements.push(
      insert("collection_items", {
        id: quote(String(value.id)),
        collection_id: quote(String(value.collection_id)),
        anime_id: integer(byMalId.get(value.anime_id)),
        mal_id: integer(value.anime_id),
        anime_image: optional(value.anime_image),
        added_at: time(value.added_at),
      })
    );

  for (const value of data.likes)
    statements.push(
      insert("collection_likes", {
        id: quote(String(value.id)),
        collection_id: quote(String(value.collection_id)),
        user_id: quote(String(value.user_id)),
        created_at: time(value.created_at),
      })
    );

  for (const value of data.comments)
    statements.push(
      insert("comments", {
        id: quote(String(value.id)),
        text: quote(value.text),
        rating: integer(value.rating),
        is_spoiler: integer(value.is_spoiler),
        user_id: quote(String(value.user_id)),
        anime_id: integer(byMalId.get(value.anime_id)),
        mal_id: integer(value.anime_id),
        parent_id: optional(
          value.parent_id === null ? null : String(value.parent_id)
        ),
        created_at: time(value.created_at),
        updated_at: time(value.updated_at),
      })
    );

  const malIds = new Set(
    [...data.items, ...data.comments].map((value) => value.anime_id)
  );

  return {
    statements,
    unresolvedMalIds: [...malIds].filter((id) => !byMalId.has(id)),
  };
}
