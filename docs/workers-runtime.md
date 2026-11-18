# Workers runtime alongside the existing app

The root Next app is retained and runnable throughout the migration. The independently runnable candidate lives in apps/worker; TanStack Start owns routing, loaders and server functions. Void is only its Cloudflare build/resource/deployment adapter, not a second pages router.

## Pinned integration

Void CLI and its @void adapters are 1.10.0; the Cloudflare Vite adapter is locked to 2.0.0-rc.1. The runtime pins Vite 8.3.8, TanStack Start 1.169.5, Router 1.170.46 and React/React DOM 18.2.0. React 18 is supported by Start's inspected peers and keeps compatibility with the existing component system. Node 24.22.2 and pnpm 10.27.0 are pinned.

The Vite plugin order is voidPlugin(), tanstackStart(), react(). No separate direct Cloudflare plugin is registered. No void init was run; AGENTS.md and global agent settings remain untouched. Void-managed auth is not used in framework mode.

## Local proof and CI

Run pnpm install --frozen-lockfile, then:

- pnpm --filter @anihub/worker prepare:types (void prepare, without credentials)
- pnpm --filter @anihub/worker typecheck
- pnpm --filter @anihub/worker build
- pnpm --filter @anihub/worker preview --port 8787
- pnpm --filter @anihub/worker test:browser
- pnpm --filter @anihub/worker check:bundle

For installed Chrome on this Mac, set PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH to its executable. CI installs Playwright's Chromium. The smoke test exercises the built artifact in local workerd, SSR, HTTP health, unsupported methods and unknown routes.

Void emits the Cloudflare build output and a compatible generated Wrangler config/redirect. The pinned Wrangler CLI is used only for an offline --dry-run bundle-size gate; actual deployment later uses Void. No Cloudflare credentials, remote provisioning or deployment is needed for any of these checks.

## Deployment boundaries

The generated artifact carries anihub.kellycooks.dev as a Custom Domain and workers.dev explicitly enabled; building this configuration does not activate DNS. Never pre-create that DNS record. Do not deploy this scaffold as the app.

Void's own-account deploy provisions resources and applies SQL by default. Routine deployments must pass --skip-migrations. Production migrations and first cutover need separate approval. No production database exists in this layer.

Changing only the Worker name is not preview isolation: Void can retain production database IDs from its lock state. The delivery layer must create separate preview state/config, explicit PR-scoped DB identity, no production routes/secrets, and verify resolved bindings. Remote isolation is not claimed without an approved actual preview deployment.

A compressed bundle below 3 MiB is not proof of the Workers Free 10ms CPU budget. Cold starts, cache misses and live OAuth callbacks need real edge measurements; local averages are diagnostic only. No paid Void platform or Workers plan is assumed.
