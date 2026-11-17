import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { buildImportSql } from "../scripts/migration";

const user = {
  id: 0,
  email: " Owner@Example.com ",
  email_verified: 0,
  username: "Original",
  avatar: null,
  created_at: "2024-10-01 10:00:00",
  updated_at: "2024-10-02 10:00:00",
};
const legacy = {
  users: [user],
  collections: [
    {
      id: 1,
      name: "Friend's list",
      description: null,
      user_id: 0,
      is_public: 1,
      likes_count: 0,
      created_at: user.created_at,
      updated_at: user.updated_at,
    },
  ],
  items: [{ id: 1, collection_id: 1, anime_id: 999, anime_image: null, added_at: user.created_at }],
  likes: [],
  comments: [
    {
      id: 1,
      text: "It's good",
      rating: 8,
      is_spoiler: 0,
      user_id: 0,
      anime_id: 999,
      parent_id: null,
      created_at: user.created_at,
      updated_at: user.updated_at,
    },
  ],
};
test("migration preserves id zero, relationships, timestamps and unresolved MAL ids without password data", () => {
  const db = new DatabaseSync(":memory:");
  try {
    db.exec("PRAGMA foreign_keys=ON;");
    for (const file of readdirSync(new URL("../migrations", import.meta.url))
      .filter((file) => file.endsWith(".sql"))
      .sort())
      db.exec(readFileSync(new URL("../migrations/" + file, import.meta.url), "utf8"));
    db.exec(buildImportSql(legacy, []));
    assert.deepEqual(
      { ...db.prepare("SELECT id,email,created_at FROM user").get() },
      {
        id: "0",
        email: "owner@example.com",
        created_at: 1727776800000,
      },
    );
    assert.deepEqual(
      { ...db.prepare("SELECT user_id,text,anime_id,mal_id FROM comments").get() },
      {
        user_id: "0",
        text: "It's good",
        anime_id: null,
        mal_id: 999,
      },
    );
    assert.equal(db.prepare("SELECT name FROM collections").get()?.name, "Friend's list");
    assert.equal(db.prepare("SELECT count(*) AS n FROM account").get()?.n, 0);
    assert.deepEqual(db.prepare("PRAGMA foreign_key_check").all(), []);
  } finally {
    db.close();
  }
});
test("migration refuses case-folded email collisions instead of silently merging users", () => {
  assert.throws(
    () =>
      buildImportSql(
        { ...legacy, users: [user, { ...user, id: 2, email: "owner@example.com" }] },
        [],
      ),
    /email collision/,
  );
});
test("migration maps a MAL id to a different AniList id, never reinterpreting the MAL id", () => {
  const media = {
    id: 42,
    idMal: 999,
    title: { romaji: "Fixture", english: null },
    description: null,
    coverImage: { extraLarge: "https://example.com/poster.jpg" },
    bannerImage: null,
    averageScore: 80,
    episodes: 12,
    seasonYear: 2024,
    format: "TV",
    status: "FINISHED",
    genres: ["Action"],
    studios: { nodes: [] },
  };
  const sql = buildImportSql(legacy, [media]);
  const db = new DatabaseSync(":memory:");
  try {
    for (const file of readdirSync(new URL("../migrations", import.meta.url))
      .filter((file) => file.endsWith(".sql"))
      .sort())
      db.exec(readFileSync(new URL("../migrations/" + file, import.meta.url), "utf8"));
    db.exec(sql);
    assert.equal(db.prepare("SELECT anime_id FROM collection_items").get()?.anime_id, 42);
    assert.equal(db.prepare("SELECT mal_id FROM comments").get()?.mal_id, 999);
  } finally {
    db.close();
  }
});
