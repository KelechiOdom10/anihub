# AniHub

The first milestone of AniHub's lean rebuild: discover anime, open a title, and sign in with Google or Discord. TanStack Start route loaders and server functions run on Cloudflare Workers; Better Auth uses Drizzle + D1; AniList is the anime source.

Logging, ratings, reviews, lists, profiles and feeds are intentionally not implemented yet. Their legacy data is preserved in the new schema. The anime page labels its future actions as disabled.

## Local development

Requires Node 24 and pnpm 10.27.

```sh
pnpm install --frozen-lockfile
cp .dev.vars.example .dev.vars
# Fill the OAuth credentials and a random BETTER_AUTH_SECRET in .dev.vars.
pnpm db:migrate:local
pnpm dev
```

Set BETTER_AUTH_URL to the dev server's origin when using Vite. To verify the built Workers artifact (the deployment boundary), use:

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm preview
# http://localhost:8787 — set BETTER_AUTH_URL to this origin in .dev.vars
pnpm exec wrangler deploy --dry-run
```

The Vite plugin writes the built config under dist/server and a Wrangler redirect under .wrangler/deploy. Do not pass the source --config to preview/deploy after building; that bypasses the compiled entry.

AniList data is real, not seeded demo data. The home response is cached in D1 for an hour; title responses for a day. Valid stale data is served if AniList is unavailable. The feature spotlight is Chainsaw Man; trending/popular rows are live. An empty or unavailable source has an intentional state. Descriptions are rendered as text, not trusted HTML.

## Authentication

Google and Discord only. No password sign-up/sign-in, reset, magic links or email service. Better Auth requires a nullable account.password schema field, but the app never sets it or imports legacy hashes.

Both providers must supply a **verified** email. A new provider identity with the same normalized email as an imported user claims that existing user ID, preserving relationships. Local legacy email verification is not trusted as a requirement: possession is proved anew by Google/Discord. Trusted-provider verification bypasses are disabled. Already-linked provider subjects retain their owner even if the provider's email changes. Legacy sessions and password/reset/verification data are not migrated.

`pnpm test` exercises actual Better Auth handlers and local D1 with fixtures at the provider HTTP boundary: both providers reclaim an imported ID, unverified/missing email issues no session, a linked subject cannot be reassigned by email, a malformed direct Google token is rejected, and password sign-in is disabled. These are not live provider logins.

## Migration

See [the migration runbook](docs/migration.md). The exporter reads Turso in one read transaction and writes an offline SQL file with mode 0600. It never connects to D1 or writes Turso. Do not commit that file; it contains personal data.

## Deploy — only after Kelechi's go

No D1 database, DNS record or production deployment is created by this branch. The all-zero database_id is deliberately a placeholder. At cutover:

1. Create a D1 database named anihub in the configured Cloudflare account. Put its returned ID into wrangler.jsonc.
2. Apply the migrations and import only after approval using the runbook.
3. Configure the provider URLs and Worker secrets listed below.
4. Run the checks, build with the production configuration and inspect `wrangler deploy --dry-run`.
5. Only on the specific deployment go, run `pnpm deploy`.

Wrangler uses a Custom Domain route for **anihub.kellycooks.dev** and enables workers.dev. This is the valid Wrangler syntax for a custom domain: `routes: [{ pattern, custom_domain: true }]`, not a `custom_domains` property. **Never pre-create its DNS record**: Cloudflare creates DNS and the certificate when deploying. The workers.dev endpoint serves the same app, but sign-in's canonical origin is BETTER_AUTH_URL; use the custom domain for production sign-in.

### Worker secret names

Set each with `pnpm exec wrangler secret put NAME`. Never put values in wrangler.jsonc or git:

- BETTER_AUTH_SECRET
- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET
- DISCORD_CLIENT_ID
- DISCORD_CLIENT_SECRET

BETTER_AUTH_URL is a non-secret Worker variable, set to `https://anihub.kellycooks.dev` in wrangler.jsonc. D1 is the DB binding. No Turso token, SendGrid key, password hash or NEXT_PUBLIC variable is needed by the Worker.

### Provider console changes

**Google Cloud Console → APIs & Services → Credentials → the OAuth web client**

- Add authorized redirect URI: `https://anihub.kellycooks.dev/api/auth/callback/google`
- Add authorized JavaScript origin: `https://anihub.kellycooks.dev`
- On the consent screen/branding, add `kellycooks.dev` as an authorized domain if needed for production.
- For local built preview, add `http://localhost:8787/api/auth/callback/google` and origin `http://localhost:8787`.

**Discord Developer Portal → the application → OAuth2 → Redirects**

- Add `https://anihub.kellycooks.dev/api/auth/callback/discord`
- For local built preview, add `http://localhost:8787/api/auth/callback/discord`.

Keep the old Vercel redirects during the transition; this branch does not touch Vercel.

## Workers Free evidence and limits

The deployment dry run is the authoritative compressed size check (3 MiB Free limit), not Vite's sum of individual gzip sizes. The build is far below that limit. Local workerd CPU sampling is diagnostic, not Cloudflare's billable CPU meter: wall-clock response time includes I/O and cannot prove the 10 ms limit. Warm public pages and OAuth initiation were sampled locally; cold starts, live provider callbacks and real edge CPU remain unverified until an approved deployment. Keep this PR draft rather than claiming every request is below 10 ms.

The legacy Next/GraphQL API and its write endpoints have been removed. Retained UI primitives: the existing shadcn Button and Card, on Tailwind v4 semantic tokens. No legacy authorization logic is reused.
