import { expect, test, type Page } from "@playwright/test";
import { libraryDatabase, sessionCookie } from "../library-fixture";

const notification = (page: Page) =>
  page.locator('[data-sonner-toast][data-front="true"]');

const status = (page: Page, name: string) =>
  page.getByRole("button", { name, exact: true });

test.skip(
  ({ baseURL }) => baseURL !== "http://127.0.0.1:8791",
  "Run the synthetic-session library harness with library.playwright.config.ts"
);

test.beforeEach(async ({ page }) => {
  const db = libraryDatabase();

  db.prepare("DELETE FROM watch_statuses").run();
  db.close();
  await page.route("**/*", (route) => {
    const url = new URL(route.request().url());

    return url.hostname === "127.0.0.1" ? route.continue() : route.abort();
  });
});

async function signIn(page: Page, token = "synthetic-alice") {
  await page.context().addCookies([
    {
      name: "better-auth.session_token",
      value: sessionCookie(token),
      url: "http://127.0.0.1:8791",
    },
  ]);
}

function savedStatuses() {
  const db = libraryDatabase();

  const rows = db
    .prepare(
      "SELECT user_id AS userId, mal_id AS malId, status FROM watch_statuses ORDER BY user_id, mal_id"
    )
    .all();

  db.close();

  return rows;
}

async function expectPressed(page: Page, pressed: string | null) {
  for (const name of ["Watching", "To Watch", "Watched"])
    await expect(status(page, name)).toHaveAttribute(
      "aria-pressed",
      String(name === pressed)
    );
}

test("signed-out status buttons link to sign-in and return to the anime", async ({
  page,
}) => {
  await page.goto("/anime/21");

  for (const name of ["Watching", "To Watch", "Watched"])
    await expect(page.getByRole("link", { name, exact: true })).toHaveAttribute(
      "href",
      /sign-in\?redirect=%2Fanime%2F21/
    );
});

test("one status at a time, saved to the account, survives reload and clears", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/anime/21");
  await expectPressed(page, null);

  await status(page, "Watching").click();
  await expectPressed(page, "Watching");
  await expect
    .poll(savedStatuses)
    .toEqual([{ userId: "library-alice", malId: 21, status: "watching" }]);

  await page.reload();
  await expectPressed(page, "Watching");

  await status(page, "To Watch").click();
  await expectPressed(page, "To Watch");
  await expect
    .poll(savedStatuses)
    .toEqual([{ userId: "library-alice", malId: 21, status: "plan_to_watch" }]);

  await status(page, "To Watch").click();
  await expectPressed(page, null);
  await expect.poll(savedStatuses).toEqual([]);

  await page.reload();
  await expectPressed(page, null);
});

test("a failed save reverts the optimistic status and shows a toast", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/anime/21");
  await status(page, "Watched").click();
  await expectPressed(page, "Watched");
  await expect.poll(savedStatuses).toHaveLength(1);

  let release = () => {};
  const held = new Promise<void>((resolve) => (release = resolve));

  await page.route("**/_serverFn/**", async (route) => {
    if (route.request().method() !== "POST") return route.continue();

    await held;
    await route.abort("connectionreset");
  });
  await status(page, "Watching").click();
  await expectPressed(page, "Watching");
  release();
  await expect(notification(page)).toContainText("Couldn't save status");
  await expectPressed(page, "Watched");
  expect(savedStatuses()).toEqual([
    { userId: "library-alice", malId: 21, status: "completed" },
  ]);
});

test("status writes are owner-bound and need a live session", async ({
  page,
  browser,
}) => {
  await signIn(page);
  await page.goto("/anime/21");
  await status(page, "Watching").click();
  await expect.poll(savedStatuses).toHaveLength(1);

  const bob = await browser.newPage();

  await signIn(bob, "synthetic-bob");
  await bob.goto("/anime/21");
  await expectPressed(bob, null);
  await status(bob, "Watched").click();
  await expect.poll(savedStatuses).toEqual([
    { userId: "library-alice", malId: 21, status: "watching" },
    { userId: "library-bob", malId: 21, status: "completed" },
  ]);
  await bob.context().clearCookies();
  await status(bob, "To Watch").click();
  await expect(notification(bob)).toContainText("Sign in again");
  await expectPressed(bob, "Watched");
  await bob.close();
  await page.reload();
  await expectPressed(page, "Watching");
});

test("my list groups the viewer's anime by status and needs sign-in", async ({
  page,
}) => {
  await page.goto("/list");
  await expect(page).toHaveURL(/\/sign-in\?redirect=%2Flist/);

  const db = libraryDatabase();

  const insert = db.prepare(
    "INSERT INTO watch_statuses (id, user_id, mal_id, status, anime_image, created_at, updated_at) VALUES (?, ?, 21, ?, NULL, 1, 1)"
  );

  insert.run("alice-21", "library-alice", "plan_to_watch");
  insert.run("bob-21", "library-bob", "watching");
  db.close();

  await signIn(page);
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "My List", exact: true })
    .click();
  await expect(page).toHaveURL(/\/list$/);

  const group = (name: string) => page.getByRole("region", { name });

  await expect(group("Watching 0").getByRole("link")).toHaveCount(0);
  await expect(group("Watched 0").getByRole("link")).toHaveCount(0);
  await expect(
    group("To Watch 1").getByRole("link", { name: "Fixture Anime 21" })
  ).toHaveAttribute("href", "/anime/21");
});

test("an account with no statuses sees an empty list", async ({ page }) => {
  await signIn(page, "synthetic-empty");
  await page.goto("/list");
  await expect(page.getByText("No anime yet.")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Discover anime" })
  ).toHaveAttribute("href", "/catalog");
});
