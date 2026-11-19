import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page, type Request } from "@playwright/test";
import { z } from "zod";
import { libraryDatabase, sessionCookie } from "../library-fixture";

const renders = process.env.ANIHUB_RENDER_DIR ?? "test-results/review-renders";
const origin = "http://127.0.0.1:8791";

const notification = (page: Page) =>
  page.locator('[data-sonner-toast][data-front="true"]');

test.beforeEach(async ({ page }) => {
  const db = libraryDatabase();

  const insert = db.prepare(`
    INSERT INTO comments (id, text, rating, is_spoiler, user_id, mal_id, anime_id, parent_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  try {
    db.prepare(
      "UPDATE user SET name = 'Synthetic alice', image = NULL WHERE id = 'library-alice'"
    ).run();
    db.prepare(
      "UPDATE user SET name = 'Synthetic bob', image = 'https://lh3.googleusercontent.com/synthetic-avatar' WHERE id = 'library-bob'"
    ).run();
    db.exec(
      "PRAGMA foreign_keys = ON; DROP TRIGGER IF EXISTS synthetic_review_failure; DELETE FROM comments WHERE user_id IN ('library-alice', 'library-bob')"
    );

    for (let index = 0; index < 12; index++)
      insert.run(
        `review-${String(index).padStart(2, "0")}`,
        index === 10
          ? '<img src=x onerror="alert(1)"> https://untrusted.invalid/ plain text'
          : `Imported review ${index}`,
        (index % 5) + 1,
        index === 11 ? 1 : 0,
        index === 10 ? "library-bob" : "library-alice",
        21,
        999,
        null,
        1700000000000 + index,
        1700000000000 + index
      );

    insert.run(
      "review-reply",
      "Historical reply stays private to this slice",
      1,
      0,
      "library-bob",
      999,
      21,
      "review-11",
      1700000000100,
      1700000000100
    );
    insert.run(
      "review-collision",
      "Unrelated MAL identity",
      1,
      0,
      "library-alice",
      999,
      21,
      null,
      1700000000100,
      1700000000100
    );
    db.prepare(
      "INSERT OR REPLACE INTO session (id, token, user_id, expires_at, created_at, updated_at) VALUES ('library-alice', 'synthetic-alice', 'library-alice', ?, 1, 1)"
    ).run(Date.now() + 3600000);
  } finally {
    db.close();
  }

  await page.route("**/*", (route) => {
    if (
      route.request().url() ===
      "https://lh3.googleusercontent.com/synthetic-avatar"
    )
      return route.fulfill({
        contentType: "image/avif",
        body: readFileSync("public/anime-male-avatar.avif"),
      });

    return new URL(route.request().url()).hostname === "127.0.0.1"
      ? route.continue()
      : route.abort();
  });
});

async function capture(page: Page, name: string) {
  mkdirSync(renders, { recursive: true });

  if (await notification(page).count())
    await expect(notification(page)).toBeInViewport({ ratio: 1 });
  await page.screenshot({
    path: join(renders, `${name}.png`),
    fullPage: !(await page.locator("dialog[open]").count()),
  });
}

async function signIn(page: Page, token = "synthetic-alice") {
  await page.context().addCookies([
    {
      name: "better-auth.session_token",
      value: sessionCookie(token),
      url: origin,
    },
  ]);
}

async function openReviews(page: Page) {
  await page.goto("/anime/21?tab=reviews");
  await expect(page.locator("[data-review-id]")).toHaveCount(10);
}

async function fillReview(page: Page, text = "  A new synthetic review  ") {
  await page
    .getByRole("button", { name: "Write a Review", exact: true })
    .click();
  await page.getByRole("radio", { name: "Rate 4 stars" }).check();
  await page.getByLabel("Your Comment", { exact: true }).fill(text);
}

function postRequest(page: Page) {
  return page.waitForRequest(
    (entry) => entry.method() === "POST" && entry.url().includes("/_serverFn/")
  );
}

const wirePayload = z
  .object({
    t: z
      .object({
        p: z
          .object({
            v: z.array(
              z
                .object({
                  p: z
                    .object({ k: z.array(z.string()), v: z.array(z.json()) })
                    .passthrough(),
                })
                .passthrough()
            ),
          })
          .passthrough(),
      })
      .passthrough(),
  })
  .passthrough();

function replaceWireData(
  captured: string,
  fields: Record<string, string | number | boolean>
) {
  const payload = wirePayload.parse(JSON.parse(captured));
  const data = payload.t.p.v[0];

  data.p.k = Object.keys(fields);
  data.p.v = Object.values(fields).map((value) =>
    value === true || value === false
      ? { t: 2, s: value ? 2 : 3 }
      : { t: Number.isFinite(value) ? 0 : 1, s: value }
  );

  return JSON.stringify(payload);
}

test("anonymous public pages preserve dated imports, canonical identity and exact safe author DTOs", async ({
  page,
  request,
}) => {
  const reads: Request[] = [];

  page.on("request", (entry) => {
    if (entry.method() === "GET" && entry.url().includes("payload="))
      reads.push(entry);
  });
  await openReviews(page);
  await expect(page.locator("[data-review-id]").first()).toHaveAttribute(
    "data-review-id",
    "review-11"
  );
  expect(
    await page
      .locator("[data-review-id]")
      .evaluateAll((cards) =>
        cards.map((card) => card.getAttribute("data-review-id"))
      )
  ).toEqual([
    "review-11",
    "review-10",
    "review-09",
    "review-08",
    "review-07",
    "review-06",
    "review-05",
    "review-04",
    "review-03",
    "review-02",
  ]);
  await expect(page.getByRole("button", { name: "Edit review" })).toHaveCount(
    0
  );
  await expect(
    page.getByRole("link", { name: "Login to Get Started" })
  ).toBeVisible();
  await expect(page.getByText("Unrelated MAL identity")).toHaveCount(0);
  await expect(
    page.getByText("Historical reply stays private to this slice")
  ).toHaveCount(0);
  await expect(
    page.locator('[data-review-id="review-10"] p').last()
  ).toHaveText(
    '<img src=x onerror="alert(1)"> https://untrusted.invalid/ plain text'
  );
  await expect(
    page.locator(
      '[data-review-id="review-10"] a, [data-review-id="review-10"] img[src="x"]'
    )
  ).toHaveCount(0);
  const spoiler = page.locator('[data-review-id="review-11"]');

  await expect(spoiler).toContainText("This review may contain spoilers.");
  await expect(
    page.getByText("Imported review 11", { exact: true })
  ).toHaveCount(0);
  await capture(page, "cards-desktop");
  await spoiler.getByRole("button", { name: "Show anyway" }).focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByText("Imported review 11", { exact: true })
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await capture(page, "cards-mobile");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390
  );

  const read = reads.find((entry) =>
    new URL(entry.url()).searchParams.get("payload")?.includes('"animeId"')
  );

  if (!read) throw new Error("Missing generated public review request");

  const response = await request.get(read.url(), {
    headers: { origin, accept: "application/json", "x-tsr-serverfn": "true" },
  });

  const body = await response.text();

  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect(body).toContain('"k":["reviews","hasNextPage"]');
  expect(body).toContain(
    '"k":["id","text","rating","isSpoiler","createdAt","updatedAt","likes","commentCount","liked","author"]'
  );
  expect(body).toContain('"k":["id","name","avatar"]');
  expect(body).toContain("Synthetic alice");
  expect(body).toContain("Synthetic bob");
  await expect(
    page.locator('[data-review-id="review-10"] img')
  ).toHaveAttribute(
    "src",
    "https://lh3.googleusercontent.com/synthetic-avatar"
  );

  const identityDb = libraryDatabase();

  identityDb
    .prepare(
      "UPDATE user SET name = 'private@example.invalid', image = 'https://untrusted.invalid/avatar.png' WHERE id = 'library-bob'"
    )
    .run();
  await page.reload();
  await expect(
    page
      .locator('[data-review-id="review-10"]')
      .getByText("Anonymous", { exact: true })
  ).toBeVisible();
  await expect(
    page.locator('[data-review-id="review-10"] img')
  ).toHaveAttribute("src", "/anime-male-avatar.avif");
  identityDb
    .prepare(
      "UPDATE user SET name = 'Synthetic bob', image = 'https://lh3.googleusercontent.com/synthetic-avatar' WHERE id = 'library-bob'"
    )
    .run();
  identityDb.close();

  for (const secret of [
    "email",
    "username",
    "@example.invalid",
    "synthetic-alice",
    "synthetic-access-secret",
    "synthetic-refresh-secret",
    "synthetic-id-secret",
    '"userId"',
    '"token"',
    '"session"',
  ])
    expect(body).not.toContain(secret);

  for (const invalid of [
    { animeId: 21, page: 0 },
    { animeId: 21, page: 1001 },
    { animeId: 0, page: 1 },
  ]) {
    const url = new URL(read.url());

    url.searchParams.set(
      "payload",
      replaceWireData(
        z.string().parse(url.searchParams.get("payload")),
        invalid
      )
    );

    const rejected = await request.get(url.href, {
      headers: { origin, "x-tsr-serverfn": "true", accept: "application/json" },
    });

    expect(await rejected.text()).not.toContain("Imported review");
  }

  await page.getByRole("button", { name: "More reviews" }).click();
  await expect(page.locator("[data-review-id]")).toHaveCount(2);
  expect(
    await page
      .locator("[data-review-id]")
      .evaluateAll((cards) =>
        cards.map((card) => card.getAttribute("data-review-id"))
      )
  ).toEqual(["review-01", "review-00"]);
  await page.getByRole("button", { name: "Previous reviews" }).click();
  await expect(page.locator("[data-review-id]")).toHaveCount(10);
});

test("blank drafts, keyboard stars, focus containment and durable create edit delete", async ({
  page,
}) => {
  await signIn(page);
  await openReviews(page);
  await expect(
    page.getByText("Imported review 11", { exact: true })
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Write a Review", exact: true })
    .click();
  await expect(page.getByRole("radio", { name: "Rate 1 stars" })).toBeFocused();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("radio", { name: "Rate 2 stars" })).toBeChecked();
  await page.getByLabel("Your Comment", { exact: true }).fill("   ");
  await page.getByRole("button", { name: "Post Comment" }).click();
  await expect(notification(page)).toContainText("Comment is required");
  await expect(page.getByLabel("Your Comment", { exact: true })).toHaveValue(
    "   "
  );

  await expect(page.getByRole("dialog")).toBeVisible();
  await capture(page, "form-error-desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  await capture(page, "form-error-mobile");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390
  );
  await page
    .getByLabel("Your Comment", { exact: true })
    .fill("  Durable review  ");
  await capture(page, "form-mobile");
  await page.setViewportSize({ width: 1440, height: 900 });
  await capture(page, "form-desktop");
  await page.getByRole("button", { name: "Close", exact: true }).focus();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("radio", { name: "Rate 2 stars" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    page.getByRole("button", { name: "Close", exact: true })
  ).toBeFocused();
  await page.getByRole("button", { name: "Post Comment" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText("Durable review", { exact: true })).toBeVisible();
  await expect(notification(page)).toContainText(
    "Comment posted successfully!"
  );
  await expect(
    page.getByRole("button", { name: "Write a Review", exact: true })
  ).toBeFocused();
  await page.reload();

  const card = page
    .locator("[data-review-id]")
    .filter({ hasText: "Durable review" });

  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "Edit review" }).click();
  await expect(page.getByLabel("Your Comment", { exact: true })).toHaveValue(
    "Durable review"
  );
  await page
    .getByLabel("Your Comment", { exact: true })
    .fill("Edited durable review");
  await page.getByRole("radio", { name: "Rate 5 stars" }).check();
  await page.getByRole("switch").check();
  await page.getByRole("button", { name: "Save Review" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Write a Review", exact: true })
  ).toBeFocused();
  await page.reload();
  await expect(
    page.getByText("Edited durable review", { exact: true })
  ).toBeVisible();
  const edited = page.locator("[data-review-id]").first();

  await expect(edited.getByLabel("5 out of 5 stars")).toBeVisible();
  await edited.getByRole("button", { name: "Delete review" }).click();
  await edited.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(
    page.getByText("Edited durable review", { exact: true })
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Write a Review", exact: true })
  ).toBeFocused();
  const db = libraryDatabase();

  expect(
    db
      .prepare(
        "SELECT count(*) AS n FROM comments WHERE text IN ('Durable review', 'Edited durable review')"
      )
      .get()
  ).toEqual({ n: 0 });
  expect(
    db
      .prepare("SELECT count(*) AS n FROM comments WHERE id LIKE 'review-%'")
      .get()
  ).toEqual({ n: 14 });
  db.close();
});

test("generated HTTP writes reject forged owners, invalid input, stale sessions, CSRF and destructive reply deletion", async ({
  page,
  request,
}) => {
  await signIn(page);
  await openReviews(page);
  await fillReview(page, "Captured create");
  const creating = postRequest(page);

  await page.getByRole("button", { name: "Post Comment" }).click();
  const create = await creating;

  await expect(
    page.getByText("Captured create", { exact: true })
  ).toBeVisible();
  await page
    .locator("[data-review-id]")
    .first()
    .getByRole("button", { name: "Edit review" })
    .click();
  await page.getByLabel("Your Comment", { exact: true }).fill("Captured edit");
  const editing = postRequest(page);

  await page.getByRole("button", { name: "Save Review" }).click();
  const edit = await editing;

  await expect(page.getByText("Captured edit", { exact: true })).toBeVisible();
  const own = page.locator("[data-review-id]").first();
  const id = z.string().parse(await own.getAttribute("data-review-id"));

  await own.getByRole("button", { name: "Delete review" }).click();
  const deleting = postRequest(page);

  await own.getByRole("button", { name: "Delete", exact: true }).click();
  const remove = await deleting;
  const db = libraryDatabase();

  const fields = {
    animeId: 21,
    text: "HTTP review",
    rating: 4,
    isSpoiler: false,
  };

  const count = () => db.prepare("SELECT count(*) AS n FROM comments").get();

  const post = (
    captured: Request,
    values: Record<string, string | number | boolean>,
    token = "synthetic-alice",
    source = origin,
    type = "application/json"
  ) =>
    request.post(captured.url(), {
      headers: {
        cookie: `better-auth.session_token=${sessionCookie(token)}`,
        origin: source,
        "content-type": type,
        "x-tsr-serverfn": "true",
        accept: "application/json",
      },
      data: replaceWireData(z.string().parse(captured.postData()), values),
    });

  try {
    await expect(page.locator(`[data-review-id="${id}"]`)).toHaveCount(0);
    const before = count();

    const invalid = [
      { ...fields, rating: 0 },
      { ...fields, rating: 6 },
      { ...fields, rating: 1.5 },
      { ...fields, rating: "4" },
      { ...fields, text: "" },
      { ...fields, text: "   " },
      { ...fields, text: "x".repeat(5001) },
      { ...fields, animeId: -1 },
      { ...fields, animeId: 0 },
      { ...fields, animeId: 1.5 },
      { ...fields, animeId: 2147483648 },
      { ...fields, animeId: "21" },
      { ...fields, animeId: 999 },
      { ...fields, animeId: 999999 },
      { ...fields, userId: "library-bob" },
      { ...fields, parentId: "review-11" },
    ];

    for (const input of invalid) {
      await post(create, input);
      expect(count()).toEqual(before);
    }

    for (const token of ["", "synthetic-expired", "synthetic-forged"]) {
      await post(create, fields, token);
      await post(
        edit,
        {
          id: "review-09",
          text: "Unauthorized",
          rating: 4,
          isSpoiler: false,
        },
        token
      );
      await post(remove, { id: "review-09" }, token);
      expect(count()).toEqual(before);
    }

    const changed = {
      id: "review-09",
      text: "Cross-user tamper",
      rating: 1,
      isSpoiler: false,
    };

    await post(edit, changed, "synthetic-bob");
    await post(remove, { id: "review-09" }, "synthetic-bob");
    expect(
      db
        .prepare("SELECT text, user_id FROM comments WHERE id = 'review-09'")
        .get()
    ).toEqual({ text: "Imported review 9", user_id: "library-alice" });
    await post(edit, { ...changed, userId: "library-alice" }, "synthetic-bob");
    await post(edit, { ...changed, id: "review-reply" }, "synthetic-bob");
    await post(remove, { id: "review-reply" }, "synthetic-bob");
    expect(
      db.prepare("SELECT text FROM comments WHERE id = 'review-reply'").get()
    ).toEqual({ text: "Historical reply stays private to this slice" });

    for (const mutation of [create, edit, remove]) {
      const value =
        mutation === create
          ? fields
          : mutation === edit
            ? changed
            : { id: "review-09" };

      await post(mutation, value, "synthetic-alice", "https://foreign.invalid");
      await post(mutation, value, "synthetic-alice", origin, "text/plain");
      await request.post(mutation.url(), {
        headers: {
          cookie: `better-auth.session_token=${sessionCookie("synthetic-alice")}`,
          "content-type": "application/json",
          "x-tsr-serverfn": "true",
        },
        data: replaceWireData(z.string().parse(mutation.postData()), value),
      });
    }

    const cached = z
      .object({ data: z.string() })
      .parse(
        db
          .prepare("SELECT data FROM cache_entries WHERE key = 'mal:anime:21'")
          .get()
      ).data;

    for (const invalidCache of [
      "{not-json",
      "{}",
      JSON.stringify({ ...JSON.parse(cached), id: 999 }),
    ]) {
      db.prepare(
        "UPDATE cache_entries SET data = ? WHERE key = 'mal:anime:21'"
      ).run(invalidCache);
      await post(create, fields);
      expect(count()).toEqual(before);
    }

    db.prepare(
      "UPDATE cache_entries SET data = ? WHERE key = 'mal:anime:21'"
    ).run(cached);

    await request.post(create.url(), {
      headers: {
        cookie: "better-auth.session_token=synthetic-alice.invalid",
        origin,
        "content-type": "application/json",
      },
      data: z.string().parse(create.postData()),
    });
    expect(count()).toEqual(before);
    expect(
      db.prepare("SELECT text FROM comments WHERE id = 'review-09'").get()
    ).toEqual({ text: "Imported review 9" });
    const guarded = await post(remove, { id: "review-11" });

    expect(await guarded.text()).toContain(
      "It has replies or is no longer available"
    );
    expect(count()).toEqual(before);

    const saved = await post(create, {
      ...fields,
      text: "  Trimmed HTTP review  ",
    });

    expect(await saved.text()).toContain("saved");
    expect(
      db
        .prepare(
          "SELECT text, rating, user_id, mal_id, anime_id, parent_id FROM comments WHERE text = 'Trimmed HTTP review'"
        )
        .get()
    ).toEqual({
      text: "Trimmed HTTP review",
      rating: 4,
      user_id: "library-alice",
      mal_id: 21,
      anime_id: null,
      parent_id: null,
    });
    const validEdit = await post(edit, changed);

    expect(await validEdit.text()).toContain("saved");
    expect(
      db.prepare("SELECT text FROM comments WHERE id = 'review-09'").get()
    ).toEqual({ text: "Cross-user tamper" });
  } finally {
    db.close();
  }
});

test("network and D1 failures retain drafts without automatic retry and unknown responses do not imply failure", async ({
  page,
}) => {
  await signIn(page);
  await openReviews(page);
  await fillReview(page, "Preserved draft");
  const requests: Request[] = [];

  await page.route("**/_serverFn/**", async (route) => {
    if (route.request().method() !== "POST") return route.continue();

    requests.push(route.request());
    await route.abort("connectionfailed");
  });
  await page.getByRole("button", { name: "Post Comment" }).click();
  await expect(notification(page)).toContainText("Couldn't confirm save");
  await expect(page.getByLabel("Your Comment", { exact: true })).toHaveValue(
    "Preserved draft"
  );
  expect(requests).toHaveLength(1);
  await capture(page, "network-error-desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  await capture(page, "network-error-mobile");
  await page.unroute("**/_serverFn/**");
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Refresh reviews", exact: true })
    .click();
  await expect(page.locator("[data-review-id]")).toHaveCount(10);
  await page
    .getByRole("button", { name: "Write a Review", exact: true })
    .click();
  await expect(page.getByLabel("Your Comment", { exact: true })).toHaveValue(
    "Preserved draft"
  );
  await expect(page.getByRole("radio", { name: "Rate 4 stars" })).toBeChecked();
  const db = libraryDatabase();

  db.exec(
    "CREATE TRIGGER synthetic_review_failure BEFORE INSERT ON comments BEGIN SELECT RAISE(ABORT, 'synthetic failure'); END"
  );
  await page.getByRole("button", { name: "Post Comment" }).click();
  await expect(
    page.getByRole("button", { name: "Post Comment" })
  ).toBeEnabled();
  await expect(page.getByLabel("Your Comment", { exact: true })).toHaveValue(
    "Preserved draft"
  );
  expect(
    db
      .prepare(
        "SELECT count(*) AS n FROM comments WHERE text = 'Preserved draft'"
      )
      .get()
  ).toEqual({ n: 0 });
  db.exec("DROP TRIGGER synthetic_review_failure");
  await page.route("**/_serverFn/**", async (route) => {
    if (route.request().method() !== "POST") return route.continue();

    await route.fetch();
    await route.abort("connectionfailed");
  });
  await page.getByRole("button", { name: "Post Comment" }).click();
  await expect(
    page.getByRole("button", { name: "Post Comment" })
  ).toBeEnabled();
  await expect(page.getByLabel("Your Comment", { exact: true })).toHaveValue(
    "Preserved draft"
  );
  expect(
    db
      .prepare(
        "SELECT count(*) AS n FROM comments WHERE text = 'Preserved draft'"
      )
      .get()
  ).toEqual({ n: 1 });
  await page.unroute("**/_serverFn/**");
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Write a Review", exact: true })
  ).toBeFocused();
  await page.reload();
  await expect(
    page.getByText("Preserved draft", { exact: true })
  ).toBeVisible();
  expect(
    db
      .prepare(
        "SELECT count(*) AS n FROM comments WHERE text = 'Preserved draft'"
      )
      .get()
  ).toEqual({ n: 1 });
  db.close();
});

test("drafts never cross viewer or pagehide boundaries and deleting the final later-page entry returns to saved reviews", async ({
  page,
}) => {
  await signIn(page);
  await openReviews(page);
  await fillReview(page, "Alice private unsaved draft");
  await page.keyboard.press("Escape");
  await signIn(page, "synthetic-bob");
  await page
    .getByRole("button", { name: "Refresh reviews", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Write a Review", exact: true })
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Write a Review", exact: true })
    .click();
  await expect(page.getByLabel("Your Comment", { exact: true })).toHaveValue(
    ""
  );
  await page
    .getByLabel("Your Comment", { exact: true })
    .fill("Bob private unsaved draft");
  await page.evaluate(() =>
    window.dispatchEvent(
      new PageTransitionEvent("pagehide", { persisted: true })
    )
  );
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.evaluate(() =>
    window.dispatchEvent(
      new PageTransitionEvent("pageshow", { persisted: true })
    )
  );
  await page
    .getByRole("button", { name: "Write a Review", exact: true })
    .click();
  await expect(page.getByLabel("Your Comment", { exact: true })).toHaveValue(
    ""
  );
  await page.keyboard.press("Escape");
  await signIn(page);
  await page
    .getByRole("button", { name: "Refresh reviews", exact: true })
    .click();
  const db = libraryDatabase();

  db.prepare("DELETE FROM comments WHERE id = 'review-00'").run();
  await page.getByRole("button", { name: "More reviews" }).click();
  await expect(page.locator("[data-review-id]")).toHaveCount(1);
  await page
    .locator('[data-review-id="review-01"]')
    .getByRole("button", { name: "Delete review" })
    .click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.locator("[data-review-id]")).toHaveCount(10);
  await expect(
    page.getByRole("button", { name: "Previous reviews" })
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Write a Review", exact: true })
  ).toBeFocused();
  db.close();
});

test("loading error retry empty and session-expiry states remain useful on mobile", async ({
  page,
}) => {
  let release: () => void = () => {};

  const paused = new Promise<void>((resolve) => {
    release = resolve;
  });

  await page.route("**/_serverFn/**", async (route) => {
    if (route.request().url().includes("payload=")) await paused;

    await route.continue();
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/anime/21?tab=reviews");
  await expect(page.getByText("Loading comments…")).toBeVisible();
  await capture(page, "loading-mobile");
  release();
  await expect(page.locator("[data-review-id]")).toHaveCount(10);
  await page.unroute("**/_serverFn/**");
  await page.route("**/_serverFn/**", (route) =>
    route.request().url().includes("payload=")
      ? route.abort()
      : route.continue()
  );
  await page.reload();
  await expect(notification(page)).toContainText("Couldn't load reviews");
  await capture(page, "read-error-mobile");
  await page.unroute("**/_serverFn/**");
  await page.getByRole("button", { name: "Retry reviews" }).click();
  await expect(page.locator("[data-review-id]")).toHaveCount(10);
  const db = libraryDatabase();

  db.exec(
    "PRAGMA foreign_keys = ON; DELETE FROM comments WHERE user_id IN ('library-alice', 'library-bob')"
  );
  await page.reload();
  await expect(
    page.getByText("No comments yet. Be the first to share your thoughts!")
  ).toBeVisible();
  await capture(page, "empty-mobile");
  await signIn(page);
  await page.reload();
  await fillReview(page, "Session expired draft");
  db.exec("DELETE FROM session WHERE id = 'library-alice'");
  await page.getByRole("button", { name: "Post Comment" }).click();
  await expect(notification(page)).toContainText("Sign in again");
  await expect(page.getByLabel("Your Comment", { exact: true })).toHaveValue(
    "Session expired draft"
  );
  expect(db.prepare("SELECT count(*) AS n FROM comments").get()).toEqual({
    n: 0,
  });
  db.close();
});

test("pending publish is single-flight and reply deletion explains why discussion is preserved", async ({
  page,
}) => {
  await signIn(page);
  await openReviews(page);
  const parent = page.locator('[data-review-id="review-11"]');

  await parent.getByRole("button", { name: "Delete review" }).click();
  await parent.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(notification(page)).toContainText(
    "It has replies or is no longer available"
  );
  await fillReview(page, "Single pending publish");
  let release: () => void = () => {};

  const paused = new Promise<void>((resolve) => {
    release = resolve;
  });

  let writes = 0;

  await page.route("**/_serverFn/**", async (route) => {
    if (route.request().method() !== "POST") return route.continue();

    writes++;
    await paused;
    await route.continue();
  });
  await page.getByRole("button", { name: "Post Comment" }).click();
  await expect(
    page.getByRole("button", { name: "Publishing…" })
  ).toBeDisabled();
  await expect(
    page.getByLabel("Your Comment", { exact: true })
  ).toHaveAttribute("readonly", "");
  await page
    .getByRole("dialog")
    .locator("form")
    .evaluate((form) => {
      if (!(form instanceof HTMLFormElement))
        throw new Error("Missing review form");

      form.requestSubmit();
    });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(writes).toBe(1);
  await capture(page, "pending-desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  await capture(page, "pending-mobile");
  release();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByText("Single pending publish", { exact: true })
  ).toBeVisible();
  expect(writes).toBe(1);
  const db = libraryDatabase();

  expect(
    db
      .prepare(
        "SELECT count(*) AS n FROM comments WHERE text = 'Single pending publish'"
      )
      .get()
  ).toEqual({ n: 1 });
  expect(
    db
      .prepare(
        "SELECT count(*) AS n FROM comments WHERE id IN ('review-11', 'review-reply')"
      )
      .get()
  ).toEqual({ n: 2 });
  db.close();
});

test("likes persist per viewer and the review owner cannot like their own review", async ({
  page,
}) => {
  await signIn(page, "synthetic-bob");
  await openReviews(page);

  const review = page.locator('[data-review-id="review-09"]');
  const like = review.getByRole("button", { name: "Like review" });

  await expect(like).toHaveAttribute("aria-pressed", "false");
  await like.click();
  await expect(like).toHaveAttribute("aria-pressed", "true");
  await expect(like).toContainText("1 like");
  await page.reload();
  await expect(
    page
      .locator('[data-review-id="review-09"]')
      .getByRole("button", { name: "1 like review" })
  ).toHaveAttribute("aria-pressed", "true");

  const db = libraryDatabase();

  expect(
    db
      .prepare("SELECT user_id FROM review_likes WHERE review_id = 'review-09'")
      .all()
  ).toEqual([{ user_id: "library-bob" }]);
  db.close();

  await page.context().clearCookies();
  await signIn(page);
  await openReviews(page);

  const owned = page.locator('[data-review-id="review-09"]');

  await expect(owned.getByRole("button", { name: /like/i })).toHaveCount(0);
  await expect(owned).toContainText("1 like");

  await page.context().clearCookies();
  await signIn(page, "synthetic-bob");
  await openReviews(page);
  await page
    .locator('[data-review-id="review-09"]')
    .getByRole("button", { name: "1 like review" })
    .click();
  await expect(
    page
      .locator('[data-review-id="review-09"]')
      .getByRole("button", { name: "Like review" })
  ).toHaveAttribute("aria-pressed", "false");
});

test("comments open under a review, persist, and can be removed by their author or the review owner", async ({
  page,
}) => {
  await signIn(page, "synthetic-bob");
  await openReviews(page);

  const review = page.locator('[data-review-id="review-09"]');

  await review.getByRole("button", { name: "Comment" }).click();
  await review.getByLabel("Add a comment").fill("  First synthetic comment  ");
  await review.getByRole("button", { name: "Post" }).click();
  await expect(
    review.getByRole("list", { name: "Comments on this review" })
  ).toContainText("First synthetic comment");
  await expect(review.getByRole("button", { name: "1 comment" })).toBeVisible();
  await review.getByLabel("Add a comment").fill("Second synthetic comment");
  await review.getByRole("button", { name: "Post" }).click();
  await expect(review.locator("[data-comment-id]")).toHaveCount(2);
  await capture(page, "comments-desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  await capture(page, "comments-mobile");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390
  );

  await page.context().clearCookies();
  await page.reload();

  const anonymous = page.locator('[data-review-id="review-09"]');

  await anonymous.getByRole("button", { name: "2 comments" }).click();
  await expect(anonymous.locator("[data-comment-id]")).toHaveCount(2);
  await expect(anonymous.getByLabel("Add a comment")).toHaveCount(0);
  await expect(
    anonymous.getByRole("button", { name: "Delete comment" })
  ).toHaveCount(0);

  await signIn(page);
  await page.reload();

  const owned = page.locator('[data-review-id="review-09"]');

  await owned.getByRole("button", { name: "2 comments" }).click();

  const first = owned
    .locator("[data-comment-id]")
    .filter({ hasText: "First synthetic comment" });

  await first.getByRole("button", { name: "Delete comment" }).click();
  await first.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(owned.locator("[data-comment-id]")).toHaveCount(1);
  await expect(owned.getByRole("button", { name: "1 comment" })).toBeVisible();

  const db = libraryDatabase();

  expect(
    db
      .prepare(
        "SELECT text, user_id FROM review_comments WHERE review_id = 'review-09'"
      )
      .all()
  ).toEqual([{ text: "Second synthetic comment", user_id: "library-bob" }]);
  db.close();
});
