import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { z } from "zod";
import { libraryDatabase, sessionCookie } from "../library-fixture";

const renders = process.env.ANIHUB_RENDER_DIR ?? "test-results/library-renders";

test.skip(
  ({ baseURL }) => baseURL !== "http://127.0.0.1:8791",
  "Run the synthetic-session library harness with library.playwright.config.ts"
);

test.beforeEach(async ({ page }) => {
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());

    return url.hostname === "127.0.0.1" ? route.continue() : route.abort();
  });
});

async function capture(page: Page, name: string) {
  mkdirSync(renders, { recursive: true });
  await page.screenshot({ path: join(renders, `${name}.png`), fullPage: true });
}

async function signIn(page: Page, token = "synthetic-alice") {
  await page.context().addCookies([
    {
      name: "better-auth.session_token",
      value: sessionCookie(token),
      url: "http://127.0.0.1:8791",
    },
  ]);
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
  fields: Record<string, string | number>
) {
  const payload = wirePayload.parse(JSON.parse(captured));
  const data = payload.t.p.v[0];

  data.p.k = Object.keys(fields);
  data.p.v = Object.values(fields).map((value) => ({
    t: Number.isFinite(value) ? 0 : 1,
    s: value,
  }));

  return JSON.stringify(payload);
}

function cookieHeader(token: string) {
  return `better-auth.session_token=${sessionCookie(token)}`;
}

test("generated HTTP handlers enforce owner, session, input, DTO and cross-origin boundaries", async ({
  page,
  request,
}) => {
  await signIn(page);
  await page.goto("/anime/21");
  await page
    .getByRole("button", { name: "Create collection", exact: true })
    .click();
  await page.getByLabel("Name", { exact: true }).fill("HTTP capture");

  const mutationRequest = page.waitForRequest(
    (entry) => entry.method() === "POST" && entry.url().includes("/_serverFn/")
  );

  await page.getByRole("button", { name: "Create & Add" }).click();
  const mutation = await mutationRequest;
  const captured = z.string().parse(mutation.postData());

  await expect(page).toHaveURL(/collections/);
  await page
    .getByRole("link", { name: "Catalog", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "Catalog", exact: true })
  ).toBeVisible();

  const libraryRequest = page.waitForRequest(
    (entry) =>
      entry.method() === "GET" &&
      entry.url().includes("/_serverFn/") &&
      entry.url().includes("payload")
  );

  await page
    .getByRole("link", { name: "My Collections", exact: true })
    .first()
    .click();
  const library = await libraryRequest;

  await expect(
    page.getByRole("heading", { name: "My Collections", exact: true })
  ).toBeVisible();

  const itemRequest = page.waitForRequest(
    (entry) => entry.method() === "GET" && entry.url().includes("/_serverFn/")
  );

  await page.getByRole("button", { name: "Show more titles" }).click();
  const itemRead = await itemRequest;
  const db = libraryDatabase();

  const count = () =>
    z
      .object({ n: z.number() })
      .parse(db.prepare("SELECT count(*) AS n FROM collections").get()).n;

  const post = (
    fields: Record<string, string | number>,
    token = "synthetic-alice",
    origin = "http://127.0.0.1:8791"
  ) =>
    request.post(mutation.url(), {
      headers: {
        cookie: cookieHeader(token),
        origin,
        "content-type": "application/json",
        "x-tsr-serverfn": "true",
        accept: "application/json",
      },
      data: replaceWireData(captured, fields),
    });

  try {
    const auth = await request.get("/api/auth/get-session", {
      headers: { cookie: cookieHeader("synthetic-alice") },
    });

    expect(await auth.json()).toMatchObject({ user: { id: "library-alice" } });
    const before = count();

    const invalidInputs: Array<Record<string, string | number>> = [
      { name: "", animeId: 21 },
      { name: "   ", animeId: 21 },
      { name: "x".repeat(101), animeId: 21 },
      { name: "Limits", description: "x".repeat(501), animeId: 21 },
      { name: "Bad id", animeId: -1 },
      { name: "Bad id", animeId: 1.5 },
      { name: "Bad id", animeId: 2147483648 },
      { name: "Unresolved", animeId: 999 },
      { name: "Wrong numeric source", animeId: 127230 },
      { name: "Owner injection", animeId: 21, userId: "library-bob" },
      { name: "Privacy injection", animeId: 21, isPublic: "true" },
      {
        name: "Image injection",
        animeId: 21,
        animeImage: "https://untrusted.invalid/private.jpg",
      },
    ];

    for (const fields of invalidInputs) {
      await post(fields);
      expect(count()).toBe(before);
    }

    for (const token of ["", "synthetic-expired", "synthetic-forged"])
      await post({ name: "Unauthorized", animeId: 21 }, token);

    await request.post(mutation.url(), {
      headers: {
        origin: "http://127.0.0.1:8791",
        cookie: "better-auth.session_token=synthetic-alice.invalid",
        "content-type": "application/json",
      },
      data: replaceWireData(captured, {
        name: "Forged signature",
        animeId: 21,
      }),
    });
    await post(
      { name: "Foreign origin", animeId: 21 },
      "synthetic-alice",
      "https://foreign.invalid"
    );
    await request.post(mutation.url(), {
      headers: {
        cookie: cookieHeader("synthetic-alice"),
        origin: "http://127.0.0.1:8791",
        "content-type": "text/plain",
      },
      data: captured,
    });
    expect(count()).toBe(before);

    const created = await post({
      name: "  Trimmed HTTP  ",
      description: "  Try next  ",
      animeId: 21,
    });

    expect(await created.text()).toContain("created");
    expect(count()).toBe(before + 1);
    expect(
      db
        .prepare(
          "SELECT c.name, c.description, c.user_id, c.is_public, i.mal_id, i.anime_id FROM collections c JOIN collection_items i ON i.collection_id = c.id WHERE c.name = 'Trimmed HTTP'"
        )
        .get()
    ).toEqual({
      name: "Trimmed HTTP",
      description: "Try next",
      user_id: "library-alice",
      is_public: 0,
      mal_id: 21,
      anime_id: null,
    });
    await post({ name: "Empty from HTTP" });
    expect(
      db
        .prepare(
          "SELECT count(*) AS n FROM collection_items WHERE collection_id IN (SELECT id FROM collections WHERE name = 'Empty from HTTP')"
        )
        .get()
    ).toEqual({ n: 0 });

    const read = async (url: string, token: string) => {
      const response = await request.get(url, {
        headers: {
          cookie: cookieHeader(token),
          origin: "http://127.0.0.1:8791",
          "x-tsr-serverfn": "true",
          accept: "application/json",
        },
      });

      const text = await response.text();

      expect(response.headers()["cache-control"]).toContain("no-store");

      return text;
    };

    const alice = await read(library.url(), "synthetic-alice");

    expect(alice).toContain("Alice secret");
    expect(alice).toContain(
      '"k":["id","name","description","isPublic","items","hasNextPage"]'
    );
    expect(alice).not.toContain("Bob secret");

    for (const secret of [
      "@example.invalid",
      "synthetic-alice",
      "synthetic-access-secret",
      "synthetic-refresh-secret",
      "synthetic-id-secret",
      '"email"',
      '"userId"',
      '"token"',
    ])
      expect(alice).not.toContain(secret);

    const bob = await read(library.url(), "synthetic-bob");

    expect(bob).toContain("Bob secret");
    expect(bob).not.toContain("Alice secret");
    const itemUrl = new URL(itemRead.url());

    itemUrl.searchParams.set(
      "payload",
      replaceWireData(z.string().parse(itemUrl.searchParams.get("payload")), {
        collectionId: "library-alice-private",
        page: 1,
      })
    );
    const bobItems = await read(itemUrl.href, "synthetic-bob");

    expect(JSON.parse(bobItems)).toEqual({
      t: 10,
      i: 0,
      p: {
        k: ["result"],
        v: [
          {
            t: 10,
            i: 1,
            p: {
              k: ["items", "hasNextPage"],
              v: [
                { t: 9, i: 2, a: [], o: 0 },
                { t: 2, s: 3 },
              ],
            },
            o: 0,
          },
        ],
      },
      o: 0,
    });

    for (const value of [
      "library-known",
      "library-unmapped",
      "ONE PIECE",
      "cdn.myanimelist.net",
    ])
      expect(bobItems).not.toContain(value);
    expect(await read(library.url(), "synthetic-forged")).not.toContain(
      "secret"
    );
    const ownerQuery = new URL(library.url());

    ownerQuery.searchParams.set(
      "payload",
      replaceWireData(
        z.string().parse(ownerQuery.searchParams.get("payload")),
        { page: 1, userId: "library-alice" }
      )
    );

    const tampered = await request.get(ownerQuery.href, {
      headers: {
        cookie: cookieHeader("synthetic-bob"),
        origin: "http://127.0.0.1:8791",
        "x-tsr-serverfn": "true",
      },
    });

    expect(await tampered.text()).toContain("unrecognized_keys");

    for (const pageNumber of [0, 1.5, 1001]) {
      const invalidPage = new URL(library.url());

      invalidPage.searchParams.set(
        "payload",
        replaceWireData(
          z.string().parse(invalidPage.searchParams.get("payload")),
          { page: pageNumber }
        )
      );

      const response = await request.get(invalidPage.href, {
        headers: {
          cookie: cookieHeader("synthetic-alice"),
          origin: "http://127.0.0.1:8791",
          "x-tsr-serverfn": "true",
        },
      });

      const text = await response.text();

      expect(text).toContain("error");
      expect(text).not.toContain("Alice secret");
    }

    const cache = z
      .object({ data: z.string() })
      .parse(
        db
          .prepare("SELECT data FROM cache_entries WHERE key = 'mal:anime:21'")
          .get()
      );

    try {
      db.prepare(
        "UPDATE cache_entries SET data = '{' WHERE key = 'mal:anime:21'"
      ).run();
      const offline = await read(library.url(), "synthetic-alice");

      expect(offline).toContain("Alice secret");
      expect(offline).toContain("Trimmed HTTP");
      expect(offline).toContain("Anime unavailable");
      expect(offline).not.toContain("ONE PIECE");
    } finally {
      db.prepare(
        "UPDATE cache_entries SET data = ? WHERE key = 'mal:anime:21'"
      ).run(cache.data);
    }

    const html = await page.reload();

    if (!html) throw new Error("Expected a fresh private document response");

    const ssr = await html.text();

    expect(ssr).toContain("Alice secret");
    expect(html.headers()["cache-control"]).toContain("no-store");

    for (const secret of [
      "bob@example.invalid",
      "alice@example.invalid",
      "synthetic-alice",
      "synthetic-access-secret",
      "synthetic-refresh-secret",
      "synthetic-id-secret",
      "Bob secret",
    ])
      expect(ssr).not.toContain(secret);
    expect(
      db
        .prepare(
          "SELECT is_public FROM collections WHERE id = 'library-alice-public'"
        )
        .get()
    ).toEqual({ is_public: 1 });
  } finally {
    db.close();
  }
});

for (const size of [
  { width: 1440, height: 900, name: "desktop" },
  { width: 390, height: 844, name: "mobile" },
])
  test(`private create persists and preserves keyboard/draft/pending states on ${size.name}`, async ({
    page,
  }) => {
    await page.setViewportSize(size);
    await signIn(page);
    await page.goto("/anime/21");
    await capture(page, `anime-${size.name}`);

    const trigger = page.getByRole("button", {
      name: "Create collection",
      exact: true,
    });

    await trigger.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByLabel("Name", { exact: true })).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(
      page.getByRole("button", { name: "Create & Add" })
    ).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByLabel("Name", { exact: true })).toBeFocused();
    await page.getByLabel("Name", { exact: true }).fill(`Weekend ${size.name}`);
    await page.getByLabel("Description (optional)").fill("Try next");
    await capture(page, `dialog-${size.name}`);
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
    await trigger.click();
    await expect(page.getByLabel("Name", { exact: true })).toHaveValue(
      `Weekend ${size.name}`
    );
    await page.getByRole("button", { name: "Cancel", exact: true }).focus();
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("button", { name: "Create & Add" })
    ).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByLabel("Name", { exact: true })).toBeFocused();

    const db = libraryDatabase();

    db.exec(
      "CREATE TRIGGER synthetic_item_failure BEFORE INSERT ON collection_items BEGIN SELECT RAISE(ABORT, 'synthetic item failure'); END;"
    );
    db.close();
    await page.getByRole("button", { name: "Create & Add" }).click();
    await expect(page.getByRole("alert")).toContainText("Couldn't save");
    await expect(page.getByLabel("Name", { exact: true })).toHaveValue(
      `Weekend ${size.name}`
    );
    await capture(page, `error-${size.name}`);
    const restored = libraryDatabase();

    expect(
      restored
        .prepare("SELECT count(*) AS n FROM collections WHERE name = ?")
        .get(`Weekend ${size.name}`)
    ).toEqual({ n: 0 });
    restored.exec("DROP TRIGGER synthetic_item_failure;");
    restored.close();

    let release: () => void = () => {};

    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    let posts = 0;

    await page.route("**/_serverFn/**", async (route) => {
      if (route.request().method() === "POST") {
        posts++;
        await gate;
      }

      await route.continue();
    });
    await page.getByRole("button", { name: "Create & Add" }).click();
    await expect(
      page.getByRole("button", { name: "Creating…" })
    ).toBeDisabled();
    await page.getByLabel("Name", { exact: true }).press("Enter");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeVisible();
    await capture(page, `pending-${size.name}`);
    release();
    await expect(page).toHaveURL(/\/collections/);
    await expect(
      page.getByRole("heading", { name: `Weekend ${size.name}`, exact: true })
    ).toBeVisible();
    expect(posts).toBe(1);
    await page.reload();
    await expect(
      page.getByRole("heading", { name: `Weekend ${size.name}`, exact: true })
    ).toBeVisible();
    await capture(page, `library-${size.name}`);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth
      )
    ).toBe(true);
    const persisted = libraryDatabase();

    expect(
      persisted
        .prepare(
          "SELECT c.user_id, c.is_public, i.mal_id, i.anime_id FROM collections c JOIN collection_items i ON i.collection_id = c.id WHERE c.name = ?"
        )
        .get(`Weekend ${size.name}`)
    ).toEqual({
      user_id: "library-alice",
      is_public: 0,
      mal_id: 21,
      anime_id: null,
    });
    persisted.close();
    await page
      .getByRole("link", { name: "ONE PIECE", exact: true })
      .first()
      .click();
    await expect(page).toHaveURL(/\/anime\/21$/);
  });

test("guest action returns safely without writing and empty library offers discovery", async ({
  page,
}) => {
  await page.goto("/anime/21");
  await page.getByRole("link", { name: "Create collection" }).click();
  await expect(page).toHaveURL(/sign-in\?redirect=%2Fanime%2F21/);
  await expect(
    page.getByRole("button", { name: "Log in with Google" })
  ).toBeVisible();
  await signIn(page, "synthetic-empty");
  await page.goto("/collections");
  await expect(
    page.getByText("You don't have any collections yet.")
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByText("Menu", { exact: true }).click();
  await expect(
    page.getByRole("navigation", { name: "Mobile navigation" })
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("navigation", { name: "Mobile navigation" })
  ).not.toBeVisible();
  await page
    .getByRole("button", { name: "Create collection", exact: true })
    .click();
  await page.getByLabel("Name", { exact: true }).fill("   ");
  await page
    .getByRole("button", { name: "Create Collection", exact: true })
    .click();
  await expect(page.getByRole("alert")).toHaveText("Name is required.");
  await expect(page.getByLabel("Name", { exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await capture(page, "library-empty");
});

test("a lost response does not silently retry a committed create or discard its draft", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/anime/21");
  await page
    .getByRole("button", { name: "Create collection", exact: true })
    .click();
  await page.getByLabel("Name", { exact: true }).fill("Response lost");
  let requests = 0;

  await page.route("**/_serverFn/**", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();

      return;
    }

    requests++;
    await route.fetch();
    await route.abort("connectionreset");
  });
  await page.getByRole("button", { name: "Create & Add" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Couldn't confirm the save"
  );
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue(
    "Response lost"
  );
  const db = libraryDatabase();

  expect(
    db
      .prepare(
        "SELECT count(*) AS n FROM collections WHERE name = 'Response lost'"
      )
      .get()
  ).toEqual({ n: 1 });
  db.close();
  expect(requests).toBe(1);
  await page.keyboard.press("Escape");
  await page.goto("/collections");
  await expect(
    page.getByRole("heading", { name: "Response lost", exact: true })
  ).toBeVisible();
});

test("persisted-page restoration revalidates the session rather than keeping a private document", async ({
  page,
}) => {
  await signIn(page, "synthetic-bob");
  await page.goto("/collections");
  await expect(
    page.getByRole("heading", { name: "Bob secret", exact: true })
  ).toBeVisible();

  const signout = await page.request.post("/api/auth/sign-out", {
    headers: { origin: "http://127.0.0.1:8791" },
    data: {},
  });

  expect(signout.ok()).toBe(true);
  await page.evaluate(() =>
    window.dispatchEvent(
      new PageTransitionEvent("pageshow", { persisted: true })
    )
  );
  await expect(page).toHaveURL(/sign-in/);
  await expect(page.getByText("Bob secret", { exact: true })).toHaveCount(0);
});

test("expiry retains draft, imported pagination is local, and signout/back cannot show private lists", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/collections");
  await expect(
    page.getByRole("heading", { name: "Alice secret", exact: true })
  ).toBeVisible();
  await expect(page.getByText("Imported public collection")).toBeVisible();
  await expect(page.getByText("Bob secret", { exact: true })).toHaveCount(0);

  const privateList = page.locator("article").filter({
    has: page.getByRole("heading", { name: "Alice secret", exact: true }),
  });

  const unavailable = privateList
    .locator("li")
    .filter({ hasText: "Anime unavailable" })
    .first();

  await expect(unavailable.locator("a")).toHaveCount(0);
  await expect(unavailable.locator("img")).toHaveAttribute(
    "src",
    "/fallback-anime.avif"
  );

  const imported = page
    .locator("article")
    .filter({ hasText: "Imported public collection" });

  await expect(
    imported.getByText("Anime unavailable", { exact: true })
  ).toBeVisible();
  await expect(imported.locator("li a")).toHaveCount(0);
  await page.getByRole("button", { name: "Show more titles" }).click();
  await expect(
    page.getByRole("button", { name: "Show more titles" })
  ).toHaveCount(0);
  await page.goto("/anime/21");
  await page
    .getByRole("button", { name: "Create collection", exact: true })
    .click();
  await page.getByLabel("Name", { exact: true }).fill("Expired draft");
  await signIn(page, "synthetic-expired");
  await page.getByRole("button", { name: "Create & Add" }).click();
  await expect(page.getByRole("alert")).toContainText("session has ended");
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue(
    "Expired draft"
  );
  await capture(page, "session-expired");
  await signIn(page);
  await page.goto("/collections");
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Sign in", exact: true })
  ).toBeVisible();
  await page.goBack();
  await page.goBack();
  await expect(page).toHaveURL(/sign-in/);
  await expect(page.getByText("Alice secret", { exact: true })).toHaveCount(0);
  await page.goto("/collections");
  await expect(page).toHaveURL(/sign-in/);
});
