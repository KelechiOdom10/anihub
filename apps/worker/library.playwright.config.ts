import { defineConfig } from "@playwright/test";
import { librarySecret } from "./tests/library-fixture";

export default defineConfig({
  testDir: "./tests/browser",
  testMatch: ["library.spec.ts", "reviews.spec.ts", "watch-status.spec.ts"],
  globalSetup: "./tests/library-fixture.ts",
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:8791",
    viewport: { width: 1440, height: 900 },
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    },
  },
  webServer: {
    command: "pnpm preview --host 127.0.0.1 --port 8791 --strictPort",
    url: "http://127.0.0.1:8791/api/health",
    reuseExistingServer: false,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      BETTER_AUTH_SECRET: librarySecret,
      BETTER_AUTH_URL: "http://127.0.0.1:8791",
      GOOGLE_CLIENT_ID: "synthetic",
      GOOGLE_CLIENT_SECRET: "synthetic",
      DISCORD_CLIENT_ID: "synthetic",
      DISCORD_CLIENT_SECRET: "synthetic",
      MAL_CLIENT_ID: "synthetic",
    },
    timeout: 30000,
  },
});
