import { test, expect } from "@playwright/test";

test("the built Worker serves SSR, health and auth routes and rejects unsupported requests", async ({
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

  const auth = await request.get("/api/auth/ok");

  expect(auth.status()).toBe(200);

  const password = await request.post("/api/auth/sign-in/email", {
    headers: { origin: "http://127.0.0.1:8789" },
    data: { email: "a@example.com", password: "unused-password" },
  });

  expect(password.status()).toBe(400);
  expect(await password.json()).toMatchObject({
    code: "EMAIL_PASSWORD_DISABLED",
  });

  const missing = await request.get("/this-route-does-not-exist");

  expect(missing.status()).toBe(404);
});
