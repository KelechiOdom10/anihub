import { createHmac } from "node:crypto";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import seedCatalog from "./browser/seed";

export const librarySecret =
  "library-synthetic-secret-with-thirty-two-characters";

export function sessionCookie(token: string) {
  const signature = createHmac("sha256", librarySecret)
    .update(token)
    .digest("base64");

  return encodeURIComponent(`${token}.${signature}`);
}

function sqliteFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);

    return entry.isDirectory()
      ? sqliteFiles(path)
      : entry.name.endsWith(".sqlite")
        ? [path]
        : [];
  });
}

export function libraryDatabase() {
  const files = sqliteFiles(".void/v3/d1/miniflare-D1DatabaseObject").filter(
    (file) => !file.endsWith("metadata.sqlite")
  );

  if (files.length !== 1)
    throw new Error("Expected one isolated local preview database");

  return new DatabaseSync(files[0]);
}

export default function seedLibrary() {
  seedCatalog();

  const db = libraryDatabase();
  const now = Date.now();

  try {
    db.prepare(
      "UPDATE cache_entries SET data = json_set(data, '$.coverImage.extraLarge', '/fallback-anime.avif') WHERE key LIKE 'mal:anime:%'"
    ).run();
    db.exec(
      "PRAGMA foreign_keys = ON; DROP TRIGGER IF EXISTS synthetic_item_failure; DELETE FROM user WHERE id LIKE 'library-%';"
    );

    const insertUser = db.prepare(
      "INSERT INTO user (id, name, email, email_verified, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)"
    );

    for (const name of ["alice", "bob", "empty"]) {
      insertUser.run(
        `library-${name}`,
        `Synthetic ${name}`,
        `${name}@example.invalid`,
        now,
        now
      );
      db.prepare(
        "INSERT INTO session (id, token, user_id, expires_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
      ).run(
        `library-${name}`,
        `synthetic-${name}`,
        `library-${name}`,
        now + 3_600_000,
        now,
        now
      );
    }

    db.prepare(
      "INSERT INTO session (id, token, user_id, expires_at, created_at, updated_at) VALUES ('library-expired', 'synthetic-expired', 'library-alice', 1, 1, 1)"
    ).run();
    db.prepare(
      "INSERT INTO account (id, account_id, provider_id, user_id, access_token, refresh_token, id_token, created_at, updated_at) VALUES ('library-account', 'synthetic-subject', 'discord', 'library-alice', 'synthetic-access-secret', 'synthetic-refresh-secret', 'synthetic-id-secret', 1, 1)"
    ).run();

    const list = db.prepare(
      "INSERT INTO collections (id, name, description, user_id, is_public, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );

    list.run(
      "library-alice-private",
      "Alice secret",
      "Alice private description",
      "library-alice",
      0,
      now,
      now
    );
    list.run(
      "library-alice-public",
      "Imported public",
      "Original visibility is preserved",
      "library-alice",
      1,
      now - 1,
      now
    );
    list.run(
      "library-bob-private",
      "Bob secret",
      "Bob private description",
      "library-bob",
      0,
      now,
      now
    );

    const item = db.prepare(
      "INSERT INTO collection_items (id, collection_id, mal_id, anime_id, anime_image, added_at) VALUES (?, ?, ?, ?, ?, ?)"
    );

    item.run(
      "library-known",
      "library-alice-private",
      21,
      999,
      "https://cdn.myanimelist.net/images/anime/6/73245.jpg",
      now
    );
    item.run(
      "library-unmapped",
      "library-alice-private",
      999,
      null,
      "https://untrusted.invalid/private.jpg",
      now - 1
    );
    item.run("library-legacy", "library-alice-public", null, 21, null, now);

    for (let index = 0; index < 14; index++)
      item.run(
        `library-extra-${index}`,
        "library-alice-private",
        100_000 + index,
        null,
        null,
        now - index - 2
      );
  } finally {
    db.close();
  }
}
