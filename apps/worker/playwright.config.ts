import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  testIgnore: "reviews.spec.ts",
  workers: 3,
  globalSetup: "./tests/browser/seed.ts",
  use: {
    baseURL: "http://127.0.0.1:8789",
    viewport: { width: 1280, height: 900 },
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    },
  },
  webServer: {
    command: "pnpm preview --host 127.0.0.1 --port 8789 --strictPort",
    url: "http://127.0.0.1:8789/api/health",
    reuseExistingServer: false,
    env: {
      BETTER_AUTH_SECRET: "browser-smoke-secret-with-thirty-two-characters",
      BETTER_AUTH_URL: "http://127.0.0.1:8789",
      GOOGLE_CLIENT_ID: "browser-smoke",
      GOOGLE_CLIENT_SECRET: "browser-smoke",
      DISCORD_CLIENT_ID: "browser-smoke",
      DISCORD_CLIENT_SECRET: "browser-smoke",
      MAL_CLIENT_ID: "browser-smoke",
    },
    timeout: 30000,
  },
});
