import { expect, test, type Page } from "@playwright/test";

function delayData(page: Page, ms: number) {
  return page.route("**/_serverFn/**", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, ms));
    await route.continue();
  });
}

test("the home hero loads first and below-the-fold covers wait", async ({
  page,
}) => {
  await page.goto("/");

  const urgent = page.locator('img[fetchpriority="high"]');

  await expect(urgent).toHaveCount(1);
  await expect(urgent).toHaveAttribute("loading", "eager");
  await expect(urgent).toHaveAttribute("alt", "Fixture Anime 1005");

  const popular = page
    .locator("section", {
      has: page.getByRole("heading", { name: "Popular Anime" }),
    })
    .locator("img");

  await expect(popular.first()).toHaveAttribute("loading", "lazy");
  await expect(popular.first()).toHaveAttribute("sizes", "224px");
  await expect(popular.first()).toHaveAttribute("width", "425");
  await expect(popular.first()).toHaveAttribute("height", "600");
});

test("a slow catalog load shows the page frame with card skeletons, then results", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await delayData(page, 1500);

  await page
    .getByRole("link", { name: "Catalog", exact: true })
    .first()
    .click();

  await expect(page.getByTestId("route-progress")).toBeVisible();

  const loading = page.getByRole("status", { name: "Loading" });

  await expect(loading).toBeVisible();
  await expect(
    loading.locator(".animate-pulse.bg-neutral-700")
  ).not.toHaveCount(0);
  await expect(
    page.getByRole("searchbox", { name: "Search anime" })
  ).toBeVisible();
  await expect(page.locator('main a[href^="/anime/"]:visible')).toHaveCount(0);

  await expect(page.locator('main a[href^="/anime/"]:visible')).toHaveCount(25);
  await expect(loading).toHaveCount(0);
  await expect(page.getByTestId("route-progress")).toHaveCount(0);
});

test("a slow home load keeps the hero and carousel shapes", async ({
  page,
}) => {
  await page.goto("/catalog");
  await expect(page.locator('a[href^="/anime/"]')).toHaveCount(25);
  await delayData(page, 1500);

  await page.getByRole("link", { name: "Home", exact: true }).first().click();

  const loading = page.getByRole("status", { name: "Loading" });

  await expect(
    loading.getByRole("heading", { name: "Top Airing" })
  ).toBeVisible();
  await expect(
    loading.getByRole("heading", { name: "Categories" })
  ).toBeVisible();

  const skeletonHero = await loading.locator("> div").first().boundingBox();

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Fixture Anime 1005"
  );

  const hero = await page.locator("main > div").first().boundingBox();

  expect(hero?.height).toBe(skeletonHero?.height);
});

test("built assets are cached for a year", async ({ page, request }) => {
  await page.goto("/");

  const script = await page
    .locator('script[src^="/assets/"], link[href^="/assets/"]')
    .first()
    .evaluate((node) => node.getAttribute("src") ?? node.getAttribute("href"));

  const response = await request.get(script!);

  expect(response.headers()["cache-control"]).toBe(
    "public, max-age=31536000, immutable"
  );
});

test("a slow anime page load keeps the header, poster and tab shapes", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await delayData(page, 1500);

  await page
    .getByRole("link", { name: "Fixture Anime 21", exact: true })
    .click();

  const loading = page.getByRole("status", { name: "Loading" });

  await expect(loading).toBeVisible();
  await expect(page).toHaveURL(/\/anime\/21$/);

  const skeletonHeader = await loading.locator("> div").first().boundingBox();

  await expect(
    page.getByRole("navigation", { name: "Anime tabs" })
  ).toBeVisible();
  await expect(loading).toHaveCount(0);

  const header = await page.locator("main > div").first().boundingBox();

  expect(header?.height).toBe(skeletonHeader?.height);
});
