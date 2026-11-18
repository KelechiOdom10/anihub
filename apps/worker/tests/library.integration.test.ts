import assert from "node:assert/strict";
import { test } from "node:test";
import { createTestDatabase } from "./d1";

test("a failed second D1 batch statement rolls back the collection, not just the item", async () => {
  const { d1, dispose } = await createTestDatabase();

  try {
    await d1
      .prepare(
        "INSERT INTO user (id, name, email, created_at, updated_at) VALUES ('synthetic-owner', 'Synthetic', 'atomic@example.invalid', 1, 1)"
      )
      .run();
    await assert.rejects(
      d1.batch([
        d1.prepare(
          "INSERT INTO collections (id, name, user_id, is_public, created_at, updated_at) VALUES ('atomic-list', 'Weekend', 'synthetic-owner', 0, 1, 1)"
        ),
        d1.prepare(
          "INSERT INTO collection_items (id, collection_id, mal_id, added_at) VALUES ('atomic-item', 'nonexistent-parent', 21, 1)"
        ),
      ])
    );
    assert.equal(
      await d1.prepare("SELECT count(*) AS n FROM collections").first("n"),
      0
    );
    assert.equal(
      await d1.prepare("SELECT count(*) AS n FROM collection_items").first("n"),
      0
    );
    await d1.batch([
      d1.prepare(
        "INSERT INTO collections (id, name, user_id, is_public, created_at, updated_at) VALUES ('atomic-list', 'Weekend', 'synthetic-owner', 0, 1, 1)"
      ),
      d1.prepare(
        "INSERT INTO collection_items (id, collection_id, mal_id, added_at) VALUES ('atomic-item', 'atomic-list', 21, 1)"
      ),
    ]);
    assert.equal(
      await d1
        .prepare("SELECT user_id FROM collections WHERE id = 'atomic-list'")
        .first("user_id"),
      "synthetic-owner"
    );
    assert.equal(
      await d1
        .prepare(
          "SELECT mal_id FROM collection_items WHERE collection_id = 'atomic-list'"
        )
        .first("mal_id"),
      21
    );
  } finally {
    await dispose();
  }
});
