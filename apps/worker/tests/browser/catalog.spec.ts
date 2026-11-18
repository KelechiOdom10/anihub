import { expect, test, type Page } from "@playwright/test";

function trackErrors(page: Page) {
  const errors: string[] = [];

  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  return errors;
}

const results = (page: Page) => page.locator('a[href^="/anime/"]');

test("search and filters live in the URL and survive reload and back", async ({
  page,
}) => {
  const errors = trackErrors(page);

  await page.goto("/catalog");
  await expect(results(page)).toHaveCount(25);

  const search = page.getByRole("searchbox", { name: "Search anime" });

  await search.fill("Fixture");
  await search.press("Enter");
  await expect(page).toHaveURL(/\/catalog\?q=Fixture$/);
  await expect(page.getByRole("button", { name: "Fixture" })).toBeVisible();
  await expect(results(page)).toHaveCount(25);

  await page.getByRole("checkbox", { name: "TV Show" }).click();
  await expect(page).toHaveURL(/type=tv/);
  await expect(results(page)).toHaveCount(6);

  await page.getByRole("checkbox", { name: "Complete" }).click();
  await expect(results(page)).toHaveCount(4);

  await page.reload();
  await expect(search).toHaveValue("Fixture");
  await expect(page.getByRole("checkbox", { name: "TV Show" })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: "Complete" })).toBeChecked();
  await expect(results(page)).toHaveCount(4);

  await page.goBack();
  await expect(page).not.toHaveURL(/status=/);
  await expect(
    page.getByRole("checkbox", { name: "Complete" })
  ).not.toBeChecked();
  await expect(results(page)).toHaveCount(6);

  await page.getByRole("button", { name: "Clear All", exact: true }).click();
  await expect(page).toHaveURL(/\/catalog$/);
  await expect(search).toHaveValue("");
  expect(errors).toEqual([]);
});

test("sort by title reorders search results and flips direction", async ({
  page,
}) => {
  await page.goto("/catalog?q=Fixture");

  await page.getByRole("combobox", { name: "Sort by" }).selectOption("title");
  await expect(page).toHaveURL(/order_by=title/);

  const first = await results(page).first().getAttribute("aria-label");

  await page.getByRole("button", { name: "Ascending" }).click();
  await expect(page).toHaveURL(/sort=desc/);
  await expect(results(page).first()).not.toHaveAttribute(
    "aria-label",
    first ?? ""
  );
});

test("a two-letter search is not sent", async ({ page }) => {
  await page.goto("/catalog");

  const search = page.getByRole("searchbox", { name: "Search anime" });

  await search.fill("ab");
  await search.press("Enter");
  await expect(page.getByText("Enter at least 3 characters")).toBeVisible();
  await expect(page).toHaveURL(/\/catalog$/);
});

test("on a phone the filters open in a sheet", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/catalog?q=Fixture");

  await page.getByRole("button", { name: "Filters" }).click();

  const sheet = page.getByRole("dialog", { name: "Filters" });

  await sheet.getByRole("checkbox", { name: "Movie" }).click();
  await expect(page).toHaveURL(/type=movie/);
  await expect(results(page)).toHaveCount(6);

  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();
});
