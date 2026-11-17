import { defineConfig } from "void/config";

export default defineConfig({
  sourceDir: "src",
  target: "cloudflare",
  inference: { appType: "framework", bindings: { db: false } },
  routing: { isr: false },
  worker: {
    compatibility_date: "2026-11-17",
    compatibility_flags: ["nodejs_compat"],
  },
  cloudflare: {
    name: "anihub",
    account_id: "ab6145b5f4d74c798229173319deaf21",
    workers_dev: true,
    routes: [{ pattern: "anihub.kellycooks.dev", custom_domain: true }],
  },
});
