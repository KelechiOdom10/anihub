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

const labels = {
  watching: "Watching",
  plan_to_watch: "To Watch",
  completed: "Watched",
} as const;

async function expectStatus(page: Page, current: keyof typeof labels | null) {
  if (!current) {
    await expect(status(page, "To Watch")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /, change status$/ })
    ).toHaveCount(0);

    return;
  }

  await expect(status(page, `${labels[current]}, change status`)).toBeVisible();
}

async function pick(page: Page, item: string) {
  await page
    .getByRole("button", { name: /^More statuses$|, change status$/ })
    .click();
  await page.getByRole("menuitem", { name: item, exact: true }).click();
}

test("signed-out status control links to sign-in and returns to the anime", async ({
  page,
}) => {
  await page.goto("/anime/21");
  await expect(
    page.getByRole("link", { name: "To Watch", exact: true })
  ).toHaveAttribute("href", /sign-in\?redirect=%2Fanime%2F21/);
});

test("one status at a time, saved to the account, survives reload and is removable", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/anime/21");
  await expectStatus(page, null);

  await status(page, "To Watch").click();
  await expectStatus(page, "plan_to_watch");
  await expect
    .poll(savedStatuses)
    .toEqual([{ userId: "library-alice", malId: 21, status: "plan_to_watch" }]);

  await page.reload();
  await expectStatus(page, "plan_to_watch");

  await status(page, "To Watch, change status").click();
  await expect(page.getByRole("menuitem")).toHaveText([
    "Watching",
    "Watched",
    "Remove from list",
  ]);
  await page.getByRole("menuitem", { name: "Watching", exact: true }).click();
  await expectStatus(page, "watching");
  await expect
    .poll(savedStatuses)
    .toEqual([{ userId: "library-alice", malId: 21, status: "watching" }]);

  await pick(page, "Remove from list");
  await expectStatus(page, null);
  await expect.poll(savedStatuses).toEqual([]);

  await page.reload();
  await expectStatus(page, null);
});

test("the status menu works by keyboard", async ({ page }) => {
  await signIn(page);
  await page.goto("/anime/21", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "More statuses" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("menuitem", { name: "Watching" })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("menuitem", { name: "Watched" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "More statuses" })
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("Enter");
  await expectStatus(page, "completed");
  await expect.poll(savedStatuses).toHaveLength(1);
});

test("a failed save reverts the optimistic status and shows a toast", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("/anime/21");
  await pick(page, "Watched");
  await expectStatus(page, "completed");
  await expect.poll(savedStatuses).toHaveLength(1);

  let release = () => {};
  const held = new Promise<void>((resolve) => (release = resolve));

  await page.route("**/_serverFn/**", async (route) => {
    if (route.request().method() !== "POST") return route.continue();

    await held;
    await route.abort("connectionreset");
  });
  await pick(page, "Watching");
  await expectStatus(page, "watching");
  release();
  await expect(notification(page)).toContainText("Couldn't save status");
  await expectStatus(page, "completed");
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
  await pick(page, "Watching");
  await expect.poll(savedStatuses).toHaveLength(1);

  const bob = await browser.newPage();

  await signIn(bob, "synthetic-bob");
  await bob.goto("/anime/21");
  await expectStatus(bob, null);
  await pick(bob, "Watched");
  await expect.poll(savedStatuses).toEqual([
    { userId: "library-alice", malId: 21, status: "watching" },
    { userId: "library-bob", malId: 21, status: "completed" },
  ]);
  await bob.context().clearCookies();
  await pick(bob, "To Watch");
  await expect(notification(bob)).toContainText("Sign in again");
  await expectStatus(bob, "completed");
  await bob.close();
  await page.reload();
  await expectStatus(page, "watching");
});

test("my list shows one tab per status and needs sign-in", async ({ page }) => {
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

  const tabs = page.getByRole("navigation", { name: "List tabs" });

  await expect(tabs.getByRole("link")).toHaveText([
    "Watching0",
    "To Watch1",
    "Watched0",
  ]);
  await expect(tabs.getByRole("link", { name: /Watching/ })).toHaveAttribute(
    "aria-current",
    "page"
  );
  await expect(page.getByText("No anime yet.")).toBeVisible();

  await tabs.getByRole("link", { name: /To Watch/ }).click();
  await expect(page).toHaveURL(/status=plan_to_watch/);
  await expect(
    page.getByRole("link", { name: "Fixture Anime 21", exact: true })
  ).toHaveAttribute("href", "/anime/21");
  await expect(page.getByText("No anime yet.")).toHaveCount(0);
});

test("an account with no statuses sees an empty state on every tab", async ({
  page,
}) => {
  await signIn(page, "synthetic-empty");

  for (const status of ["watching", "plan_to_watch", "completed"]) {
    await page.goto(`/list?status=${status}`);
    await expect(page.getByText("No anime yet.")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Discover anime" })
    ).toHaveAttribute("href", "/catalog");
  }
});
