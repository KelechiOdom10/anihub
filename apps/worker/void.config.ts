import { defineConfig } from "void/config";
import { cloudflareTarget } from "./deploy-target";

export default defineConfig({
  sourceDir: "src",
  target: "cloudflare",
  inference: { appType: "framework", bindings: { db: true } },
  routing: { isr: false },
  worker: {
    compatibility_date: "2026-11-17",
    compatibility_flags: ["nodejs_compat"],
  },
  cloudflare: cloudflareTarget(
    process.env.ANIHUB_PREVIEW,
    process.env.ANIHUB_PREVIEW_ACCOUNT_ID
  ),
});
