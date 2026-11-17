import { writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { createClient } from "@libsql/client/web";
import { z } from "zod";
import { animeSchema, mediaFields, type Anime } from "../src/server/anime";
import { buildImportStatements, legacySchema } from "./legacy-import";

const { values } = parseArgs({
  options: { output: { type: "string" } },
  strict: true,
});

const output = z
  .string()
  .endsWith(
    ".import.sql",
    "Pass --output /private/path/anihub.import.sql outside the repository"
  )
  .parse(values.output);

const env = z
  .object({ DATABASE_URL: z.url(), DATABASE_AUTH_TOKEN: z.string().min(1) })
  .parse(process.env);

const client = createClient({
  url: env.DATABASE_URL,
  authToken: env.DATABASE_AUTH_TOKEN,
});

const tables = {
  users: "id, email, email_verified, username, avatar, created_at, updated_at",
  collections:
    "id, name, description, user_id, is_public, likes_count, created_at, updated_at",
  collection_items: "id, collection_id, anime_id, anime_image, added_at",
  collection_likes: "id, collection_id, user_id, created_at",
  comments:
    "id, text, rating, is_spoiler, user_id, anime_id, parent_id, created_at, updated_at",
};

try {
  const snapshot = await client.batch(
    [
      ...Object.entries(tables).map(
        ([table, columns]) => `SELECT ${columns} FROM anihub_${table}`
      ),
      "SELECT count(*) AS count FROM anihub_oauth_accounts",
    ],
    "read"
  );

  const bindings = z
    .object({ count: z.number().int() })
    .parse(snapshot[5]?.rows[0]);

  if (bindings.count !== 0)
    throw new Error(
      "Legacy OAuth bindings exist; reconcile their identity continuity before exporting"
    );

  const data = legacySchema.parse({
    users: snapshot[0]?.rows,
    collections: snapshot[1]?.rows,
    items: snapshot[2]?.rows,
    likes: snapshot[3]?.rows,
    comments: snapshot[4]?.rows,
  });

  const malIds = [
    ...new Set(
      [...data.items, ...data.comments].map((value) => value.anime_id)
    ),
  ];

  const media: Anime[] = [];

  const mappingResponse = z.object({
    data: z.record(z.string(), animeSchema.nullable()),
  });

  for (let offset = 0; offset < malIds.length; offset += 10) {
    const fields = malIds
      .slice(offset, offset + 10)
      .map(
        (id) => `m${id}: Media(idMal: ${id}, type: ANIME) { ${mediaFields} }`
      )
      .join(" ");

    const response = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: `{ ${fields} }` }),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok)
      throw new Error(
        `AniList mapping failed (${response.status}); no import file was written`
      );

    const result = mappingResponse.parse(await response.json());

    media.push(...Object.values(result.data).filter((value) => value !== null));

    if (offset + 10 < malIds.length)
      await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  const { statements, unresolvedMalIds } = buildImportStatements(
    data,
    media,
    Date.now()
  );

  await writeFile(output, statements.join("\n") + "\n", {
    mode: 0o600,
    flag: "wx",
  });
  console.log(
    JSON.stringify({
      users: data.users.length,
      collections: data.collections.length,
      items: data.items.length,
      likes: data.likes.length,
      comments: data.comments.length,
      mappedAnime: media.length,
      unresolvedMalIds,
    })
  );
  console.log("Offline SQL written. No D1 writes were performed.");
} finally {
  client.close();
}
