import { expect, test, type Page } from "@playwright/test";

function trackErrors(page: Page) {
  const errors: string[] = [];

  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  return errors;
}

test("home restores the original hero, overlapping carousels and transparent header", async ({
  page,
}) => {
  const errors = trackErrors(page);

  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Fixture Anime 209502"
  );
  await expect(page.getByRole("heading", { name: "Top Airing" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Popular Anime" })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Fixture Anime 21", exact: true })
  ).toBeVisible();
  expect(
    await page.evaluate(() => getComputedStyle(document.body).fontFamily)
  ).toContain("Inter");
  expect(await page.evaluate(() => document.fonts.check("16px Inter"))).toBe(
    true
  );

  const header = page.locator("header");

  await expect(header).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await page.mouse.wheel(0, 600);
  await expect(header).toHaveCSS("background-color", "rgb(18, 18, 18)");
  expect(errors).toEqual([]);
});

test("carousels and the header are keyboard reachable", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Home page" }).first()
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Catalog", exact: true })
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "My Collections", exact: true })
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Sign in" })).toBeFocused();
  await page
    .getByRole("link", { name: "Fixture Anime 21", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/anime\/21$/);
});

test("anime page shows details from the cached MyAnimeList record", async ({
  page,
}) => {
  const errors = trackErrors(page);
  const response = await page.goto("/anime/21");

  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle("Fixture Anime 21 | Anihub");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Fixture Anime 21",
      exact: true,
    })
  ).toBeVisible();
  await expect(page.getByText("Currently Airing")).toBeVisible();
  await expect(page.getByText("20 October 1999 to Unknown")).toBeVisible();
  await expect(page.getByText("Fixture Studio 1")).toBeVisible();
  await expect(page.locator("main")).toContainText(
    "Synthetic synopsis for Fixture Anime 21."
  );
  expect(errors).toEqual([]);
});

test("invalid and unknown routes render the not-found state with a 404", async ({
  page,
}) => {
  const invalid = await page.goto("/anime/not-a-number");

  expect(invalid?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { name: "Anime not found" })
  ).toBeVisible();

  const unknown = await page.goto("/no-such-page");

  expect(unknown?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { name: "Page not found" })
  ).toBeVisible();
});

test("sign-in is a standalone centred card offering only Google and Discord", async ({
  page,
}) => {
  await page.goto("/sign-in");

  await expect(page.locator("header")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Log in with Google" })
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Log in with Discord" })
  ).toBeVisible();
  await expect(page.getByRole("textbox")).toHaveCount(0);

  await page.goto("/sign-in?error=email_not_verified");
  await expect(page.getByRole("alert")).toContainText("verified email");
});

test.describe("mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("home and anime pages fit a narrow viewport without horizontal scrolling", async ({
    page,
  }) => {
    for (const path of ["/", "/anime/21", "/sign-in"]) {
      await page.goto(path);

      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth
      );

      expect(overflow, path).toBe(0);
    }
  });
});
