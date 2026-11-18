import { expect, test, type Page } from "@playwright/test";

function trackErrors(page: Page) {
  const errors: string[] = [];

  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  return errors;
}

test("home restores the Categories cards with covers from each card's genre", async ({
  page,
}) => {
  const errors = trackErrors(page);

  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Categories" })).toBeVisible();

  const action = page.getByRole("link", { name: /The best Action Animes/ });

  await expect(action).toBeVisible();
  await expect(action.getByRole("img")).toHaveCount(3);
  await expect(action.getByRole("img").first()).toHaveAttribute(
    "alt",
    "Fixture Anime 1007"
  );
  await expect(
    page
      .getByRole("link", { name: /The best Romance Animes/ })
      .getByRole("img")
      .first()
  ).toHaveAttribute("alt", "Fixture Anime 1018");
  await expect(
    page.getByRole("link", { name: /The best Sci-Fi Animes/ })
  ).toBeVisible();

  await page.reload();
  await expect(
    page.getByRole("link", { name: /The best .* Animes/ }).nth(0)
  ).toContainText("Action");
  expect(errors).toEqual([]);
});

test("a category opens its genre results, which page with Show More", async ({
  page,
}) => {
  const errors = trackErrors(page);

  await page.goto("/");
  await page.getByRole("link", { name: /The best Action Animes/ }).click();

  await expect(page).toHaveURL(/\/catalog\?genres=Action$/);
  await expect(page).toHaveTitle("Action Anime | Anihub");
  await expect(page.getByRole("button", { name: "Action" })).toBeVisible();

  const results = page.locator('a[href^="/anime/"]');

  await expect(results).toHaveCount(25);
  await expect(results.first()).toHaveAttribute(
    "aria-label",
    "Fixture Anime 1007"
  );

  await page.getByRole("button", { name: "Show More" }).click();
  await expect(results).toHaveCount(50);
  await expect(results.nth(25)).toHaveAttribute(
    "aria-label",
    "Fixture Anime 1036"
  );

  await page.getByRole("button", { name: "Action" }).click();
  await expect(page).toHaveURL(/\/catalog$/);
  await expect(results).toHaveCount(25);
  expect(errors).toEqual([]);
});

test("legacy numeric genre links redirect to the matching genre", async ({
  page,
}) => {
  const response = await page.goto("/catalog?genres=22");

  await expect(page).toHaveURL(/\/catalog\?genres=Romance$/);
  expect(response?.ok()).toBe(true);
  await expect(page.locator('a[href^="/anime/"]').first()).toHaveAttribute(
    "aria-label",
    "Fixture Anime 1018"
  );
});

test("unsupported genre values say so instead of showing unrelated anime", async ({
  page,
}) => {
  for (const value of ["41", "1,4", "Isekai"]) {
    await page.goto(`/catalog?genres=${encodeURIComponent(value)}`);
    await expect(
      page.getByRole("heading", { name: "Genre not available" })
    ).toBeVisible();
    await expect(page.locator('a[href^="/anime/"]')).toHaveCount(0);
  }
});
