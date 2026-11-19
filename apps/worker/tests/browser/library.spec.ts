import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium, expect, test, type Page } from "@playwright/test";
import { z } from "zod";
import { libraryDatabase, sessionCookie } from "../library-fixture";

const renders = process.env.ANIHUB_RENDER_DIR ?? "test-results/library-renders";

const notification = (page: Page) =>
  page.locator('[data-sonner-toast][data-front="true"]');

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

function restoreSession(name: string) {
  const db = libraryDatabase();

  db.prepare(
    "INSERT OR REPLACE INTO session (id, token, user_id, expires_at, created_at, updated_at) VALUES (?, ?, ?, ?, 1, 1)"
  ).run(
    `library-${name}`,
    `synthetic-${name}`,
    `library-${name}`,
    Date.now() + 3_600_000
  );
  db.close();
}

function cookieHeader(token: string) {
  return `better-auth.session_token=${sessionCookie(token)}`;
}

async function openCreate(page: Page) {
  await page
    .getByRole("button", { name: "Add to Collection", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Create New Collection", exact: true })
    .click();
}

test("generated HTTP handlers enforce owner, session, input, DTO and cross-origin boundaries", async ({
  page,
  request,
}) => {
  await signIn(page);
  await page.goto("/anime/21");
  await openCreate(page);
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
      "Fixture Anime 21",
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
      expect(offline).not.toContain("Fixture Anime 21");
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
      name: "Add to Collection",
      exact: true,
    });

    await trigger.focus();
    await page.keyboard.press("Enter");
    await page
      .getByRole("button", { name: "Create New Collection", exact: true })
      .click();
    await expect(page.getByLabel("Name", { exact: true })).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(
      page.getByRole("button", { name: "Close", exact: true })
    ).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByLabel("Name", { exact: true })).toBeFocused();
    await page.getByLabel("Name", { exact: true }).fill(`Weekend ${size.name}`);
    await page.getByLabel("Description").fill("Try next");
    await capture(page, `dialog-${size.name}`);
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
    await trigger.click();
    await page
      .getByRole("button", { name: "Create New Collection", exact: true })
      .click();
    await expect(page.getByLabel("Name", { exact: true })).toHaveValue(
      `Weekend ${size.name}`
    );
    await page.getByRole("button", { name: "Back", exact: true }).focus();
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("button", { name: "Create & Add" })
    ).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("button", { name: "Close", exact: true })
    ).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByLabel("Name", { exact: true })).toBeFocused();
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Create New Collection", exact: true })
    ).toBeFocused();
    await page
      .getByRole("button", { name: "Create New Collection", exact: true })
      .click();

    const db = libraryDatabase();

    db.exec(
      "CREATE TRIGGER synthetic_item_failure BEFORE INSERT ON collection_items BEGIN SELECT RAISE(ABORT, 'synthetic item failure'); END;"
    );
    db.close();
    await page.getByRole("button", { name: "Create & Add" }).click();
    await expect(notification(page)).toContainText(
      "Couldn't create collection"
    );
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
    await expect(notification(page)).toContainText("Collection created");
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
      .getByRole("link", { name: "Fixture Anime 21", exact: true })
      .first()
      .click();
    await expect(page).toHaveURL(/\/anime\/21$/);
  });

test("guest action returns safely without writing and empty library offers discovery", async ({
  page,
}) => {
  await page.goto("/anime/21");
  await page.getByRole("link", { name: "Add to Collection" }).click();
  await expect(page).toHaveURL(/sign-in\?redirect=%2Fanime%2F21/);
  await expect(
    page.getByRole("button", { name: "Log in with Google" })
  ).toBeVisible();
  await signIn(page, "synthetic-empty");
  await page.goto("/collections");
  await expect(page.getByText("No collections yet.")).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByLabel("Menu", { exact: true }).click();
  await expect(
    page.getByRole("navigation", { name: "Mobile navigation" })
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("navigation", { name: "Mobile navigation" })
  ).not.toBeVisible();
  await page.getByRole("button", { name: "+ Create New", exact: true }).click();
  await page.getByLabel("Name", { exact: true }).fill("   ");
  await page
    .getByRole("button", { name: "Create Collection", exact: true })
    .click();
  await expect(notification(page)).toContainText("Enter a name");
  await expect(page.getByLabel("Name", { exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await capture(page, "library-empty");
});

test("an empty account creates its first collection from the anime chooser", async ({
  page,
}) => {
  await signIn(page, "synthetic-empty");
  await page.goto("/anime/21");
  await page
    .getByRole("button", { name: "Add to Collection", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Create Your First Collection" })
    .click();
  await page.getByLabel("Name", { exact: true }).fill("First collection");
  await page.getByRole("button", { name: "Create & Add" }).click();
  await expect(page).toHaveURL(/collections/);
  await expect(
    page.getByRole("heading", { name: "First collection", exact: true })
  ).toBeVisible();
  await expect(
    page
      .locator("article")
      .filter({
        has: page.getByRole("heading", {
          name: "First collection",
          exact: true,
        }),
      })
      .locator("li")
  ).toHaveCount(1);
  const db = libraryDatabase();

  try {
    expect(
      db
        .prepare(
          "SELECT user_id, is_public, mal_id FROM collections JOIN collection_items ON collection_id = collections.id WHERE name = ?"
        )
        .get("First collection")
    ).toEqual({ user_id: "library-empty", is_public: 0, mal_id: 21 });
  } finally {
    db.close();
  }
});

test("a library read failure gives a toast and retry recovers the saved collections", async ({
  page,
}) => {
  await signIn(page);
  const db = libraryDatabase();

  db.exec("ALTER TABLE collections RENAME TO unavailable_collections");

  try {
    await page.goto("/collections");
    await expect(notification(page)).toContainText("Couldn't load collections");
  } finally {
    db.exec("ALTER TABLE unavailable_collections RENAME TO collections");
    db.close();
  }

  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Alice secret", exact: true })
  ).toBeVisible();
});

test("a lost response does not silently retry a committed create or discard its draft", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/anime/21");
  await openCreate(page);
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
  await expect(notification(page)).toContainText("Couldn't confirm save");
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

test("after hydration, synthetic persisted pagehide/pageshow events hide the library and revalidate the session", async ({
  page,
}) => {
  await signIn(page, "synthetic-bob");
  await page.goto("/collections");
  await expect(
    page.getByRole("heading", { name: "Bob secret", exact: true })
  ).toBeVisible();
  await expect(async () => {
    await page.evaluate(() =>
      window.dispatchEvent(
        new PageTransitionEvent("pagehide", { persisted: true })
      )
    );
    await expect(
      page.getByRole("heading", { name: "Bob secret", exact: true })
    ).not.toBeVisible({ timeout: 500 });
  }).toPass();

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

test("a back/forward restore, before or after hydration, never shows the library after its session ends", async () => {
  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    ignoreDefaultArgs: ["--disable-back-forward-cache"],
  });

  try {
    for (const [end, hydrated] of [
      ["sign-out", false],
      ["revoked", false],
      ["revoked", true],
    ] as const) {
      restoreSession("bob");

      const context = await browser.newContext({
        baseURL: "http://127.0.0.1:8791",
      });

      const page = await context.newPage();

      await signIn(page, "synthetic-bob");
      await page.addInitScript(() =>
        addEventListener("pageshow", (event) => {
          if (event.persisted) sessionStorage.setItem("restored", "1");
        })
      );

      if (!hydrated) await page.route(/\.m?js(\?|$)/, (route) => route.abort());

      await page.goto("/collections", { waitUntil: "domcontentloaded" });
      await expect(
        page.getByRole("heading", { name: "Bob secret", exact: true })
      ).toBeVisible();

      if (hydrated)
        await expect
          .poll(() =>
            page.evaluate(() =>
              Object.keys(
                document.getElementById("private-library") ?? {}
              ).some((key) => key.startsWith("__react"))
            )
          )
          .toBe(true);

      await page.unrouteAll();
      await Promise.all([
        page.waitForURL("http://127.0.0.1:8791/"),
        page.evaluate(() => {
          location.href = "/";
        }),
      ]);
      await page.waitForLoadState("load");

      if (end === "sign-out") {
        const status = await page.evaluate(
          async () =>
            (
              await fetch("/api/auth/sign-out", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: "{}",
              })
            ).status
        );

        expect(status).toBe(200);
      } else {
        const db = libraryDatabase();

        db.prepare("DELETE FROM session WHERE token = 'synthetic-bob'").run();
        db.close();
      }

      await page.goBack({ waitUntil: "commit" });
      await expect(page).toHaveURL(/sign-in/);
      await expect(page.getByText("Bob secret", { exact: true })).toHaveCount(
        0
      );

      if (end === "revoked")
        expect(
          await page.evaluate(() => sessionStorage.getItem("restored"))
        ).toBe("1");

      await context.close();
    }
  } finally {
    restoreSession("bob");
    await browser.close();
  }
});

test("expiry retains draft, imported pagination is local, and signout/back cannot show private lists", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/collections");
  await expect(
    page.getByRole("heading", { name: "Alice secret", exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Imported public", exact: true })
  ).toBeVisible();
  await expect(
    page
      .locator("article")
      .filter({ has: page.getByRole("heading", { name: "Imported public" }) })
      .getByRole("switch", { name: "Make this collection public" })
  ).toHaveAttribute("aria-checked", "true");
  await expect(
    page
      .locator("article")
      .filter({ has: page.getByRole("heading", { name: "Alice secret" }) })
      .getByRole("switch", { name: "Make this collection public" })
  ).toHaveAttribute("aria-checked", "false");
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

  const imported = page.locator("article").filter({
    has: page.getByRole("heading", { name: "Imported public", exact: true }),
  });

  await expect(
    imported.getByText("Anime unavailable", { exact: true })
  ).toBeVisible();
  await expect(imported.locator("li a")).toHaveCount(0);
  await page.getByRole("button", { name: "Show more titles" }).click();
  await expect(
    page.getByRole("button", { name: "Show more titles" })
  ).toHaveCount(0);
  await page.goto("/anime/21");
  await openCreate(page);
  await page.getByLabel("Name", { exact: true }).fill("Expired draft");
  await signIn(page, "synthetic-expired");
  await page.getByRole("button", { name: "Create & Add" }).click();
  await expect(notification(page)).toContainText("Sign in again");
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue(
    "Expired draft"
  );
  await capture(page, "session-expired");
  await signIn(page);
  await page.goto("/collections");
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Get Started", exact: true })
  ).toBeVisible();
  await page.evaluate(() => history.go(-2));
  await expect(page).toHaveURL(/sign-in/);
  await expect(page.getByText("Alice secret", { exact: true })).toHaveCount(0);
  await page.goto("/collections");
  await expect(page).toHaveURL(/sign-in/);
});

function membershipWire(
  captured: string,
  animeId: number,
  add: string[],
  remove: string[],
  extra: Record<string, string> = {}
) {
  const payload = wirePayload.parse(JSON.parse(captured));
  const data = payload.t.p.v[0];

  const list = (ids: string[], index: number) => ({
    t: 9,
    i: index,
    a: ids.map((id) => ({ t: 1, s: id })),
    o: 0,
  });

  data.p.k = ["animeId", "add", "remove", ...Object.keys(extra)];
  data.p.v = [
    { t: 0, s: animeId },
    list(add, 2),
    list(remove, 3),
    ...Object.values(extra).map((value) => ({ t: 1, s: value })),
  ];

  return JSON.stringify(payload);
}

test("membership HTTP validates every list before writing, is idempotent and owner-bound", async ({
  page,
  request,
}) => {
  restoreSession("alice");
  await signIn(page);
  await page.goto("/anime/21", { waitUntil: "networkidle" });

  const membershipRead = page.waitForRequest(
    (entry) => entry.method() === "GET" && entry.url().includes("/_serverFn/")
  );

  await page.getByRole("button", { name: "Add to Collection" }).click();
  const read = await membershipRead;
  const imported = page.getByRole("checkbox", { name: /Imported public/ });

  await expect(imported).not.toBeChecked();
  await imported.check();

  const mutationRequest = page.waitForRequest(
    (entry) => entry.method() === "POST" && entry.url().includes("/_serverFn/")
  );

  await page.getByRole("button", { name: /^Save Changes \(/ }).click();
  const mutation = await mutationRequest;
  const captured = z.string().parse(mutation.postData());

  await expect(notification(page)).toContainText(/Updated \d+ collections?/);

  const db = libraryDatabase();

  const items = () =>
    z
      .array(
        z.object({
          id: z.string(),
          collection_id: z.string(),
          mal_id: z.number().nullable(),
          anime_id: z.number().nullable(),
          anime_image: z.string().nullable(),
        })
      )
      .parse(
        db
          .prepare(
            "SELECT id, collection_id, mal_id, anime_id, anime_image FROM collection_items ORDER BY id"
          )
          .all()
      );

  const has = (collectionId: string) =>
    z
      .object({ n: z.number() })
      .parse(
        db
          .prepare(
            "SELECT count(*) AS n FROM collection_items WHERE collection_id = ? AND mal_id = 21"
          )
          .get(collectionId)
      ).n;

  const post = (
    body: string,
    token = "synthetic-alice",
    origin = "http://127.0.0.1:8791",
    contentType = "application/json"
  ) =>
    request.post(mutation.url(), {
      headers: {
        cookie: cookieHeader(token),
        origin,
        "content-type": contentType,
        "x-tsr-serverfn": "true",
        accept: "application/json",
      },
      data: body,
    });

  try {
    expect(has("library-alice-public")).toBe(1);
    expect(has("library-alice-private")).toBe(1);
    expect(has("library-bob-private")).toBe(0);

    const before = items();

    const rejected: Array<[number, string[], string[]]> = [
      [21, ["library-alice-public", "library-bob-private"], []],
      [21, ["library-bob-private"], ["library-alice-private"]],
      [21, [], ["library-alice-private", "library-missing"]],
      [21, ["library-alice-public", "library-alice-public"], []],
      [21, ["library-alice-public"], ["library-alice-public"]],
      [21, [], []],
      [21, Array.from({ length: 51 }, (_, index) => `list-${index}`), []],
      [
        21,
        Array.from({ length: 25 }, (_, index) => `add-${index}`),
        Array.from({ length: 26 }, (_, index) => `remove-${index}`),
      ],
      [21, [""], []],
      [-1, ["library-alice-public"], []],
      [1.5, [], ["library-alice-private"]],
      [999, ["library-alice-public"], []],
    ];

    for (const [animeId, adds, removes] of rejected) {
      const response = await post(
        membershipWire(captured, animeId, adds, removes)
      );

      expect(await response.text()).not.toContain('"saved"');
      expect(items()).toEqual(before);
    }

    const removal = membershipWire(captured, 21, [], ["library-alice-private"]);

    for (const body of [
      membershipWire(captured, 21, [], ["library-alice-private"], {
        userId: "library-bob",
      }),
      membershipWire(captured, 21, [], ["library-alice-private"], {
        animeImage: "https://untrusted.invalid/x.jpg",
      }),
    ])
      await post(body);

    for (const token of ["", "synthetic-expired", "synthetic-forged"])
      await post(removal, token);

    await post(removal, "synthetic-bob");
    await post(removal, "synthetic-alice", "https://foreign.invalid");
    await post(
      removal,
      "synthetic-alice",
      "http://127.0.0.1:8791",
      "text/plain"
    );
    expect(items()).toEqual(before);

    const repeatAdd = await post(
      membershipWire(captured, 21, ["library-alice-public"], [])
    );

    expect(await repeatAdd.text()).toContain('"saved"');
    expect(items()).toEqual(before);

    for (let attempt = 0; attempt < 2; attempt++) {
      const removed = await post(removal);

      expect(await removed.text()).toContain('"saved"');
      expect(has("library-alice-private")).toBe(0);
    }

    expect(
      db
        .prepare(
          "SELECT name, user_id, is_public FROM collections WHERE id = 'library-alice-private'"
        )
        .get()
    ).toEqual({ name: "Alice secret", user_id: "library-alice", is_public: 0 });
    expect(items()).toEqual(
      before.filter(
        (row) =>
          row.collection_id !== "library-alice-private" || row.mal_id !== 21
      )
    );

    const added = await post(
      membershipWire(captured, 21, ["library-alice-private"], [])
    );

    expect(await added.text()).toContain('"saved"');
    expect(
      db
        .prepare(
          "SELECT mal_id, anime_id, anime_image FROM collection_items WHERE collection_id = 'library-alice-private' AND mal_id = 21"
        )
        .get()
    ).toEqual({
      mal_id: 21,
      anime_id: null,
      anime_image: "/fallback-anime.avif",
    });

    const readAs = async (token: string) => {
      const response = await request.get(read.url(), {
        headers: {
          cookie: cookieHeader(token),
          origin: "http://127.0.0.1:8791",
          "x-tsr-serverfn": "true",
          accept: "application/json",
        },
      });

      expect(response.headers()["cache-control"]).toContain("no-store");

      return response.text();
    };

    const alice = await readAs("synthetic-alice");

    expect(alice).toContain("Alice secret");
    expect(alice).toContain(
      '"k":["id","name","totalItems","hasAnime","thumbnail"]'
    );
    expect(alice).not.toContain("Bob secret");

    for (const secret of [
      "@example.invalid",
      "synthetic-alice",
      "synthetic-access-secret",
      'library-alice"',
      "untrusted.invalid",
      '"userId"',
      '"email"',
    ])
      expect(alice).not.toContain(secret);

    const bob = await readAs("synthetic-bob");

    expect(bob).toContain("Bob secret");
    expect(bob).not.toContain("Alice secret");
    expect(await readAs("")).not.toContain("Alice secret");
  } finally {
    db.close();
  }
});

test("choose dialog works by keyboard on a phone, cancels, saves, survives reload and a lost response", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/anime/21");
  await expect(
    page.getByRole("link", { name: "Add to Collection" })
  ).toHaveAttribute("href", /sign-in\?redirect=%2Fanime%2F21/);
  restoreSession("alice");

  const db = libraryDatabase();

  db.exec(
    "DELETE FROM collection_items WHERE collection_id = 'library-alice-public' AND mal_id = 21; INSERT OR IGNORE INTO collection_items (id, collection_id, mal_id, added_at) VALUES ('library-known-again', 'library-alice-private', 21, 1)"
  );
  db.close();
  await signIn(page);
  await page.reload();

  const trigger = page.getByRole("button", { name: "Add to Collection" });

  await trigger.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Add to Collection" });
  const imported = dialog.getByRole("checkbox", { name: /Imported public/ });

  await expect(imported).not.toBeChecked();

  for (let step = 0; step < 40; step++) {
    if (
      await imported.evaluate((element) => element === document.activeElement)
    )
      break;

    await page.keyboard.press("Tab");
  }

  await expect(imported).toBeFocused();
  await page.keyboard.press("Space");
  await expect(imported).toBeChecked();
  await expect(
    dialog.getByRole("button", { name: /^Save Changes \(/ })
  ).toBeEnabled();
  await capture(page, "membership-pending-mobile");
  await page.setViewportSize({ width: 1440, height: 900 });
  await capture(page, "membership-pending-desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  await dialog.getByRole("button", { name: "Cancel Changes" }).click();
  await expect(imported).not.toBeChecked();
  await expect(
    dialog.getByRole("button", { name: "Close", exact: true }).first()
  ).toBeEnabled();

  await imported.press("Space");
  await page.route("**/_serverFn/**", async (route) => {
    if (route.request().method() !== "POST") return route.continue();

    await route.fetch();
    await route.abort("connectionreset");
  });
  await dialog.getByRole("button", { name: /^Save Changes \(/ }).click();
  await expect(notification(page)).toContainText("Couldn't confirm save");
  await expect(imported).toBeChecked();
  await page.unrouteAll();
  await dialog.getByRole("button", { name: /^Save Changes \(/ }).click();
  await expect(notification(page)).toContainText(/Updated \d+ collections?/);

  const overflow = await page.evaluate(() => ({
    page: document.documentElement.scrollWidth - innerWidth,
    dialog: (() => {
      const box = document
        .querySelector("dialog[open]")
        ?.getBoundingClientRect();

      return box ? Math.max(0, box.right - innerWidth, -box.left) : -1;
    })(),
  }));

  expect(overflow).toEqual({ page: 0, dialog: 0 });
  await capture(page, "membership-saved-mobile");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  await page.reload();
  await page.getByRole("button", { name: "Add to Collection" }).click();
  await expect(
    page
      .getByRole("dialog", { name: "Add to Collection" })
      .getByRole("checkbox", { name: /Imported public/ })
  ).toBeChecked();
  await expect(
    page
      .getByRole("dialog", { name: "Add to Collection" })
      .getByRole("checkbox", { name: /Alice secret/ })
  ).toBeChecked();
  await page.setViewportSize({ width: 1440, height: 900 });
  await capture(page, "membership-desktop");
  await page.evaluate(() =>
    window.dispatchEvent(
      new PageTransitionEvent("pagehide", { persisted: true })
    )
  );
  await expect(
    page.getByRole("dialog", { name: "Add to Collection" })
  ).toBeHidden();
  await expect(
    page.locator("dialog").getByText("Alice secret", { exact: true })
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Add to Collection" }).click();
  await page
    .getByRole("button", { name: "Create New Collection", exact: true })
    .click();
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue("");
});

test("a public collection opens for anyone while a private one is a 404", async ({
  browser,
}) => {
  const guest = await browser.newContext();
  const visitor = await guest.newPage();

  try {
    const opened = await visitor.goto("/collections/library-alice-public");

    expect(opened?.status()).toBe(200);
    await expect(
      visitor.getByRole("heading", { level: 1, name: "Imported public" })
    ).toBeVisible();
    await expect(visitor.getByText("Synthetic alice")).toBeVisible();

    await visitor.getByRole("link", { name: "Synthetic alice" }).click();
    await expect(visitor).toHaveURL(/\/users\/library-alice(\?page=1)?$/);
    await expect(
      visitor.getByRole("heading", { level: 1, name: "Synthetic alice" })
    ).toBeVisible();
    await expect(visitor.getByText("Bob secret")).toHaveCount(0);
    await expect(
      visitor.locator('a[href="/collections/library-alice-private"]')
    ).toHaveCount(0);

    for (const id of ["library-alice-private", "library-bob-private"]) {
      const hidden = await visitor.goto(`/collections/${id}`);

      expect(hidden?.status()).toBe(404);
      await expect(
        visitor.getByRole("heading", { name: "Collection not found" })
      ).toBeVisible();
      await expect(visitor.getByText("Alice private description")).toHaveCount(
        0
      );
    }
  } finally {
    await guest.close();
  }
});

test("the visibility switch saves at once and survives a reload", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/collections");

  const alice = page
    .locator("article")
    .filter({ has: page.getByRole("heading", { name: "Alice secret" }) });

  const toggle = alice.getByRole("switch", {
    name: "Make this collection public",
  });

  await expect(toggle).toHaveAttribute("aria-checked", "false");
  await toggle.click();
  await expect(page.getByText("Collection is now public")).toBeVisible();
  await expect(toggle).toHaveAttribute("aria-checked", "true");

  const db = libraryDatabase();

  expect(
    db
      .prepare(
        "SELECT is_public AS isPublic FROM collections WHERE id = 'library-alice-private'"
      )
      .get()
  ).toEqual({ isPublic: 1 });

  await page.reload();
  await expect(
    page
      .locator("article")
      .filter({ has: page.getByRole("heading", { name: "Alice secret" }) })
      .getByRole("switch", { name: "Make this collection public" })
  ).toHaveAttribute("aria-checked", "true");

  const guest = await page.context().browser()?.newContext();
  const visitor = await guest!.newPage();

  await visitor.goto("/collections/library-alice-private");
  await expect(
    visitor.getByRole("heading", { level: 1, name: "Alice secret" })
  ).toBeVisible();
  await guest!.close();

  await page
    .locator("article")
    .filter({ has: page.getByRole("heading", { name: "Alice secret" }) })
    .getByRole("switch", { name: "Make this collection public" })
    .click();
  await expect(page.getByText("Collection is now private")).toBeVisible();
  expect(
    db
      .prepare(
        "SELECT is_public AS isPublic FROM collections WHERE id = 'library-alice-private'"
      )
      .get()
  ).toEqual({ isPublic: 0 });
  db.close();
});

test("the new collection page creates a public collection from several picked titles", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/collections/new");

  await page.getByLabel("Name", { exact: true }).fill("Picked pair");
  await page
    .getByLabel(/Description/)
    .fill("Two synthetic titles from the picker");
  await page
    .getByRole("switch", { name: "Make this collection public" })
    .click();

  const results = page
    .getByRole("list", { name: "Select Anime" })
    .getByRole("button");

  await expect(results.first()).toBeVisible();
  await results.nth(0).click();
  await results.nth(1).click();
  await expect(page.getByText("2 selected")).toBeVisible();

  const posts: string[] = [];

  page.on("request", (request) => {
    if (request.method() === "POST") {
      posts.push(request.url());
      console.log("[debug] POST sent", request.url());
    }
  });
  page.on("requestfailed", (request) =>
    console.log(
      "[debug] request failed",
      request.method(),
      request.url(),
      request.failure()?.errorText
    )
  );
  page.on("response", (response) => {
    if (response.request().method() === "POST")
      console.log("[debug] POST response", response.status(), response.url());
  });
  page.on("console", (message) =>
    console.log("[debug] console", message.type(), message.text())
  );
  page.on("pageerror", (error) =>
    console.log("[debug] pageerror", error.message)
  );

  const savedResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      response.url().includes("_serverFn")
  );

  await page.getByRole("button", { name: "Create Collection" }).click();

  try {
    expect((await savedResponse).ok()).toBe(true);
  } catch (error) {
    console.log("[debug] posts", posts);
    console.log("[debug] url", page.url());
    console.log(
      "[debug] body",
      (await page.locator("body").innerText()).slice(0, 3000)
    );
    throw error;
  }

  const db = libraryDatabase();

  const saved = () =>
    z
      .object({ n: z.number() })
      .parse(
        db
          .prepare(
            "SELECT count(*) AS n FROM collections WHERE name = 'Picked pair'"
          )
          .get()
      ).n;

  await expect.poll(saved, { timeout: 5_000 }).toBe(1);
  await expect(notification(page)).toContainText(
    "Collection created successfully!"
  );
  await expect(page).toHaveURL(/\/collections(\?page=1)?$/, {
    timeout: 15_000,
  });

  const created = z
    .object({ id: z.string(), isPublic: z.number() })
    .parse(
      db
        .prepare(
          "SELECT id, is_public AS isPublic FROM collections WHERE name = 'Picked pair'"
        )
        .get()
    );

  expect(created.isPublic).toBe(1);
  expect(
    db
      .prepare(
        "SELECT count(*) AS n FROM collection_items WHERE collection_id = ?"
      )
      .get(created.id)
  ).toEqual({ n: 2 });
  db.close();

  const guest = await page.context().browser()?.newContext();
  const visitor = await guest!.newPage();

  await visitor.goto(`/collections/${created.id}`);
  await expect(
    visitor.getByRole("heading", { level: 1, name: "Picked pair" })
  ).toBeVisible();
  await expect(visitor.getByText("Synthetic alice")).toBeVisible();
  await guest!.close();
});
