import { z } from "zod";
import { normalizeEmail } from "../src/backend/email";
import { animeSchema, type Anime } from "../src/data/anime";

const integerId = z.number().int().nonnegative();
const stamp = z.string().min(1);
const legacyUser = z.object({
  id: integerId,
  email: z.string(),
  email_verified: z.number().int().min(0).max(1),
  username: z.string(),
  avatar: z.string().nullable(),
  created_at: stamp,
  updated_at: stamp,
});
const collection = z.object({
  id: integerId,
  name: z.string(),
  description: z.string().nullable(),
  user_id: integerId,
  is_public: z.number().int().min(0).max(1),
  likes_count: z.number().int().nonnegative(),
  created_at: stamp,
  updated_at: stamp,
});
const item = z.object({
  id: integerId,
  collection_id: integerId,
  anime_id: integerId,
  anime_image: z.string().nullable(),
  added_at: stamp,
});
const like = z.object({
  id: integerId,
  collection_id: integerId,
  user_id: integerId,
  created_at: stamp,
});
const comment = z.object({
  id: integerId,
  text: z.string(),
  rating: z.number(),
  is_spoiler: z.number().int().min(0).max(1),
  user_id: integerId,
  anime_id: integerId,
  parent_id: integerId.nullable(),
  created_at: stamp,
  updated_at: stamp,
});
export const legacySchema = z.object({
  users: z.array(legacyUser),
  collections: z.array(collection),
  items: z.array(item),
  likes: z.array(like),
  comments: z.array(comment),
});
export type LegacyData = z.infer<typeof legacySchema>;

function timestamp(value: string) {
  const time = Date.parse(value.includes("T") ? value : value.replace(" ", "T") + "Z");
  if (!Number.isFinite(time)) throw new Error("Invalid legacy timestamp");
  return time;
}
function sqlValue(value: string | number | null) {
  if (value === null) return "NULL";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Invalid numeric SQL value");
    return String(value);
  }
  return "'" + value.replaceAll("'", "''") + "'";
}
function insert(table: string, values: Record<string, string | number | null>) {
  return (
    'INSERT INTO "' +
    table +
    '" (' +
    Object.keys(values)
      .map((key) => '"' + key + '"')
      .join(", ") +
    ") VALUES (" +
    Object.values(values).map(sqlValue).join(", ") +
    ");"
  );
}
export function buildImportSql(input: unknown, mediaInput: unknown) {
  const data = legacySchema.parse(input);
  const media = z.array(animeSchema).parse(mediaInput);
  const emails = new Set<string>();
  const lines = ["PRAGMA defer_foreign_keys = ON;"];
  for (const value of data.users) {
    const email = normalizeEmail(value.email);
    if (emails.has(email))
      throw new Error("Legacy users have a normalized email collision; reconcile before importing");
    emails.add(email);
    lines.push(
      insert("user", {
        id: String(value.id),
        name: value.username,
        email,
        email_verified: value.email_verified,
        username: value.username,
        image: value.avatar,
        created_at: timestamp(value.created_at),
        updated_at: timestamp(value.updated_at),
      }),
    );
  }
  const mapped = new Map<number, Anime>();
  for (const value of media) {
    if (value.idMal !== null) mapped.set(value.idMal, value);
    lines.push(
      insert("anime_cache", {
        id: value.id,
        mal_id: value.idMal,
        data: JSON.stringify(value),
        updated_at: Date.now(),
      }),
    );
  }
  for (const value of data.collections)
    lines.push(
      insert("collections", {
        id: String(value.id),
        name: value.name,
        description: value.description,
        user_id: String(value.user_id),
        is_public: value.is_public,
        likes_count: value.likes_count,
        created_at: timestamp(value.created_at),
        updated_at: timestamp(value.updated_at),
      }),
    );
  for (const value of data.items)
    lines.push(
      insert("collection_items", {
        id: String(value.id),
        collection_id: String(value.collection_id),
        anime_id: mapped.get(value.anime_id)?.id ?? null,
        mal_id: value.anime_id,
        anime_image: value.anime_image,
        added_at: timestamp(value.added_at),
      }),
    );
  for (const value of data.likes)
    lines.push(
      insert("collection_likes", {
        id: String(value.id),
        collection_id: String(value.collection_id),
        user_id: String(value.user_id),
        created_at: timestamp(value.created_at),
      }),
    );
  for (const value of data.comments)
    lines.push(
      insert("comments", {
        id: String(value.id),
        text: value.text,
        rating: value.rating,
        is_spoiler: value.is_spoiler,
        user_id: String(value.user_id),
        anime_id: mapped.get(value.anime_id)?.id ?? null,
        mal_id: value.anime_id,
        parent_id: value.parent_id === null ? null : String(value.parent_id),
        created_at: timestamp(value.created_at),
        updated_at: timestamp(value.updated_at),
      }),
    );
  return lines.join("\n") + "\n";
}
