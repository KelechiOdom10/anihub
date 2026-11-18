import { test } from "node:test";
import assert from "node:assert/strict";

import { catalogQuerySchema } from "../src/lib/validators/catalog";

test("untrusted catalog enums and invalid pagination never reach the vendor query", () => {
  const query = catalogQuerySchema.parse({
    type: "unsupported",
    rating: "unknown",
    status: "broken",
    sort: "sideways",
    order_by: "members",
    page: "-1",
    limit: "900",
  });

  assert.equal(query.type, undefined);
  assert.equal(query.rating, undefined);
  assert.equal(query.status, undefined);
  assert.equal(query.sort, "asc");
  assert.equal(query.order_by, "popularity");
  assert.equal(query.page, undefined);
  assert.equal(query.limit, undefined);
});

test("valid catalog query values keep their meaning while strings become pagination numbers", () => {
  const query = catalogQuerySchema.parse({
    type: "tv",
    rating: "pg13",
    status: "airing",
    sort: "desc",
    order_by: "score",
    page: "2",
    limit: "20",
    sfw: "true",
  });

  assert.deepEqual(query, {
    type: "tv",
    rating: "pg13",
    status: "airing",
    sort: "desc",
    order_by: "score",
    page: 2,
    limit: 20,
    sfw: true,
  });
});
