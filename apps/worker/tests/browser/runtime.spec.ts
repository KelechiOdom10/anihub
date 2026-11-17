import { test, expect } from "@playwright/test";

test("the built Worker serves framework SSR and rejects unsupported health methods", async ({
  page,
  request,
}) => {
  const errors: string[] = [];

  page.on("pageerror", (error) => errors.push(error.message));

  const response = await page.goto("/");

  expect(response?.status()).toBe(200);
  await expect(page.locator("main")).toBeVisible();
  expect(errors).toEqual([]);

  const health = await request.get("/api/health");

  expect(health.status()).toBe(200);
  expect(await health.json()).toEqual({
    status: "ok",
    runtime: "tanstack-start",
    adapter: "void",
  });

  const unsupported = await request.post("/api/health");

  expect(unsupported.status()).toBe(405);

  const missing = await request.get("/this-route-does-not-exist");

  expect(missing.status()).toBe(404);
});
