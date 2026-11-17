import { writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { config } from "dotenv";
import { createClient } from "@libsql/client/web";
import { z } from "zod";
import { animeSchema, mediaFields, type Anime } from "../src/data/anime";
import { buildImportSql, legacySchema } from "./migration";

config({ path: ".env.local" });
const { values } = parseArgs({ options: { output: { type: "string" } }, strict: true });
if (!values.output?.endsWith(".import.sql"))
  throw new Error(
    "Pass --output /private/path/anihub.import.sql. The file contains personal data; never commit it.",
  );
const env = z
  .object({ DATABASE_URL: z.string().url(), DATABASE_AUTH_TOKEN: z.string().min(1) })
  .parse(process.env);
const client = createClient({ url: env.DATABASE_URL, authToken: env.DATABASE_AUTH_TOKEN });
const tables = {
  users: "id, email, email_verified, username, avatar, created_at, updated_at",
  collections: "id, name, description, user_id, is_public, likes_count, created_at, updated_at",
  collection_items: "id, collection_id, anime_id, anime_image, added_at",
  collection_likes: "id, collection_id, user_id, created_at",
  comments: "id, text, rating, is_spoiler, user_id, anime_id, parent_id, created_at, updated_at",
};
try {
  const snapshot = await client.batch(
    [
      ...Object.entries(tables).map(([table, columns]) => `SELECT ${columns} FROM anihub_${table}`),
      "SELECT count(*) AS count FROM anihub_oauth_accounts",
    ],
    "read",
  );
  const bindings = z.object({ count: z.number().int().nonnegative() }).parse(snapshot[5]?.rows[0]);
  if (bindings.count !== 0)
    throw new Error(
      "Legacy OAuth bindings now exist; reconcile their identity continuity before exporting",
    );
  const data = legacySchema.parse({
    users: snapshot[0]?.rows,
    collections: snapshot[1]?.rows,
    items: snapshot[2]?.rows,
    likes: snapshot[3]?.rows,
    comments: snapshot[4]?.rows,
  });
  const malIds = [...new Set([...data.items, ...data.comments].map((value) => value.anime_id))];
  const media: Anime[] = [];
  for (let offset = 0; offset < malIds.length; offset += 10) {
    const batch = malIds.slice(offset, offset + 10);
    const query =
      "{ " +
      batch.map((id) => `m${id}: Media(idMal: ${id}, type: ANIME) { ${mediaFields} }`).join(" ") +
      " }";
    const response = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok)
      throw new Error(
        "AniList mapping failed (" + response.status + "); no import file was written",
      );
    const result = z
      .object({ data: z.record(z.string(), animeSchema.nullable()) })
      .parse(await response.json());
    media.push(...Object.values(result.data).filter((value) => value !== null));
    if (offset + 10 < malIds.length) await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  const sql = buildImportSql(data, media);
  await writeFile(values.output, sql, { mode: 0o600, flag: "wx" });
  console.log(
    JSON.stringify({
      users: data.users.length,
      collections: data.collections.length,
      items: data.items.length,
      likes: data.likes.length,
      comments: data.comments.length,
      mappedAnime: media.length,
      unresolvedMalIds: malIds.filter((id) => !media.some((value) => value.idMal === id)),
    }),
  );
  console.log(
    "Offline SQL written. No D1 writes performed. Apply only to a fresh local D1 for verification.",
  );
} finally {
  client.close();
}
