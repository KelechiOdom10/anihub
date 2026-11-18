import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { buildImportStatements } from "../scripts/legacy-import";
import { createTestDatabase } from "./d1";

const owner = {
  id: 0,
  email: " Owner@Example.com ",
  email_verified: 1,
  username: "original",
  avatar: null,
  created_at: "2024-10-01 10:00:00",
  updated_at: "2024-10-02 10:00:00",
};

const legacy = {
  users: [owner],
  collections: [
    {
      id: 1,
      name: "Friend's list",
      description: null,
      user_id: 0,
      is_public: 1,
      likes_count: 0,
      created_at: owner.created_at,
      updated_at: owner.updated_at,
    },
  ],
  items: [
    {
      id: 1,
      collection_id: 1,
      anime_id: 999,
      anime_image: null,
      added_at: owner.created_at,
    },
    {
      id: 2,
      collection_id: 1,
      anime_id: 555,
      anime_image: null,
      added_at: owner.created_at,
    },
  ],
  likes: [
    { id: 1, collection_id: 1, user_id: 0, created_at: owner.created_at },
  ],
  comments: [
    {
      id: 1,
      text: "It's good\nreally",
      rating: 8,
      is_spoiler: 0,
      user_id: 0,
      anime_id: 999,
      parent_id: null,
      created_at: owner.created_at,
      updated_at: owner.updated_at,
    },
  ],
};

test("legacy import applies to migrated D1 preserving ids, text, timestamps and relationships", async () => {
  const { d1, dispose } = await createTestDatabase();

  try {
    const statements = buildImportStatements(legacy);

    await d1.batch(statements.map((statement) => d1.prepare(statement)));

    assert.deepEqual(
      await d1.prepare("SELECT id, email, created_at FROM user").first(),
      {
        id: "0",
        email: "owner@example.com",
        created_at: 1727776800000,
      }
    );
    assert.deepEqual(
      (
        await d1
          .prepare("SELECT anime_id, mal_id FROM collection_items ORDER BY id")
          .all()
      ).results,
      [
        { anime_id: null, mal_id: 999 },
        { anime_id: null, mal_id: 555 },
      ]
    );
    assert.deepEqual(
      await d1.prepare("SELECT text, anime_id, mal_id FROM comments").first(),
      {
        text: "It's good\nreally",
        anime_id: null,
        mal_id: 999,
      }
    );
    assert.equal(
      await d1.prepare("SELECT count(*) AS n FROM account").first("n"),
      0
    );
    assert.deepEqual(
      (await d1.prepare("PRAGMA foreign_key_check").all()).results,
      []
    );
  } finally {
    await dispose();
  }
});

test("legacy import refuses case-folded email collisions instead of merging accounts", () => {
  assert.throws(
    () =>
      buildImportStatements({
        ...legacy,
        users: [
          owner,
          { ...owner, id: 2, username: "copy", email: "owner@example.com" },
        ],
      }),
    /email collision/
  );
});

test("legacy import rejects malformed emails and timestamps", () => {
  assert.throws(() =>
    buildImportStatements({ ...legacy, users: [{ ...owner, email: "nope" }] })
  );
  assert.throws(() =>
    buildImportStatements({
      ...legacy,
      users: [{ ...owner, created_at: "yesterday" }],
    })
  );
});

test("D1 rejects a second user whose email differs only by case or whitespace", async () => {
  const { d1, dispose } = await createTestDatabase();

  const insert =
    "INSERT INTO user (id, name, email, created_at, updated_at) VALUES (?, ?, ?, 1, 1)";

  try {
    await d1.prepare(insert).bind("a", "A", "owner@example.com").run();
    await assert.rejects(
      d1.prepare(insert).bind("b", "B", " OWNER@example.com").run(),
      /UNIQUE/
    );
  } finally {
    await dispose();
  }
});

test("clearing AniList data keeps every user row, MAL id and MAL cache row", async () => {
  const { d1, dispose } = await createTestDatabase();

  try {
    await d1.batch(
      buildImportStatements(legacy).map((statement) => d1.prepare(statement))
    );
    await d1.batch([
      d1.prepare("UPDATE collection_items SET anime_id = mal_id + 1000"),
      d1.prepare("UPDATE comments SET anime_id = mal_id + 1000"),
      d1.prepare(
        "INSERT INTO anime_cache (id, mal_id, data, updated_at) VALUES (42, 999, '{}', 1)"
      ),
      d1.prepare(
        "INSERT INTO cache_entries (key, data, updated_at) VALUES ('home', '{}', 1), ('mal:home', '{}', 1)"
      ),
    ]);

    const counts = () =>
      d1
        .prepare(
          "SELECT (SELECT count(*) FROM user) users, (SELECT count(*) FROM collections) collections, (SELECT count(*) FROM collection_items) items, (SELECT count(*) FROM collection_likes) likes, (SELECT count(*) FROM comments) comments, (SELECT group_concat(mal_id) FROM collection_items) itemMalIds, (SELECT group_concat(mal_id) FROM comments) commentMalIds"
        )
        .first();

    const before = await counts();

    const sql = await readFile(
      new URL(
        "../src/db/migrations/20261118025919_clear_anilist.sql",
        import.meta.url
      ),
      "utf8"
    );

    await d1.batch(
      sql
        .split("--> statement-breakpoint")
        .map((statement) => statement.trim())
        .filter(Boolean)
        .map((statement) => d1.prepare(statement))
    );

    assert.deepEqual(await counts(), before);
    assert.deepEqual(
      await d1
        .prepare(
          "SELECT (SELECT count(*) FROM anime_cache) cache, (SELECT group_concat(key) FROM cache_entries) entries, (SELECT count(anime_id) FROM collection_items) itemAniList, (SELECT count(anime_id) FROM comments) commentAniList"
        )
        .first(),
      { cache: 0, entries: "mal:home", itemAniList: 0, commentAniList: 0 }
    );
  } finally {
    await dispose();
  }
});
