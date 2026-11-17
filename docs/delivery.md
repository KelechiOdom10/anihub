# Delivery

The Worker ships to Cloudflare account `ab6145b5f4d74c798229173319deaf21` from GitHub Actions. Four workflows split the work:

| Workflow               | Trigger                                  | Environment                                 | What it does                                                                     |
| ---------------------- | ---------------------------------------- | ------------------------------------------- | -------------------------------------------------------------------------------- |
| `preview.yaml`         | pull request from this repository        | `preview` (required reviewer)               | Deploys `anihub-pr-<n>` with its own `anihub-pr-<n>-db` and preview-only secrets |
| `preview-cleanup.yaml` | pull request closed                      | `preview-cleanup` (`main` only)             | Deletes the preview Worker and database                                          |
| `production.yaml`      | `Validate` succeeded on a push to `main` | `production` (`main` only, no reviewer)     | Deploys `anihub` with `--skip-migrations`, then smoke-tests the custom domain    |
| `migrate.yaml`         | manual dispatch on `main`                | `production-migrations` (required reviewer) | Applies pending D1 migrations to `anihub-db`                                     |

Nothing deploys until the repository variables below are set, so merging this layer changes nothing on its own.

## Deploy targets

`void.config.ts` takes its Cloudflare target from `deploy-target.ts`:

- With no `ANIHUB_PREVIEW`, the target is the Worker `anihub`, the custom domain `anihub.kellycooks.dev` and the database `anihub-db`.
- With `ANIHUB_PREVIEW=pr-<n>`, the target is the Worker `anihub-pr-<n>` on workers.dev, with no routes and the database `anihub-pr-<n>-db`. `ANIHUB_PREVIEW_ACCOUNT_ID` optionally moves previews to a separate Cloudflare account.

Void adopts an existing D1 database by exact name when no lock entry exists. Previews rely on that: every preview run deletes `void.lock.json` first, so each push reuses its own database and never sees production resource ids.

`pnpm --filter @anihub/worker deploy:guard` reads the generated `dist/server/wrangler.json` before every deploy and refuses when:

- a preview carries routes, another Worker or database name, a real D1 id, or a `void.lock.json`;
- production lacks the `anihub` name, the custom domain, `anihub-db` or the committed `void.lock.json`.

The guard catches mistakes. It cannot stop a hostile pull request, which can edit the guard itself. The review on the `preview` environment is the control for that, so read the diff of the exact commit before you approve a preview run.

## Credentials

Keep every secret in an environment. Repository-level secrets would be readable by any workflow a pull request edits.

| Environment             | Secret                         | Scope                                                                                        |
| ----------------------- | ------------------------------ | -------------------------------------------------------------------------------------------- |
| `production`            | `CLOUDFLARE_API_TOKEN`         | Account: Workers Scripts Edit, D1 Edit; Zone `kellycooks.dev`: Workers Routes Edit, DNS Edit |
| `production-migrations` | `CLOUDFLARE_API_TOKEN`         | Account: Workers Scripts Read, D1 Edit                                                       |
| `preview`               | `CLOUDFLARE_PREVIEW_API_TOKEN` | Account: Workers Scripts Edit, D1 Edit. No zone permissions                                  |
| `preview-cleanup`       | `CLOUDFLARE_PREVIEW_API_TOKEN` | Same token as `preview`                                                                      |

Cloudflare tokens cannot be narrowed to single Workers or databases, so a preview token in the production account can technically reach `anihub` and `anihub-db`. To remove that risk entirely, create a second Cloudflare account for previews, set `ANIHUB_PREVIEW_ACCOUNT_ID`, and scope the preview token to that account only.

Environment settings:

- `production`, `production-migrations`, `preview-cleanup`: deployment branches limited to `main`.
- `production-migrations`: required reviewer Kelechi.
- `preview`: required reviewer Kelechi, with self-review allowed. Approval applies to one run, which checks out that run's exact head commit.
- `production`: no required reviewer. After activation every successful push to `main` deploys.

Repository variables:

| Variable                       | Value                                                                   |
| ------------------------------ | ----------------------------------------------------------------------- |
| `ANIHUB_PRODUCTION_ACTIVE`     | `true` after the first cutover; anything else pauses production deploys |
| `ANIHUB_PREVIEWS`              | `true` to enable previews and cleanup                                   |
| `CLOUDFLARE_WORKERS_SUBDOMAIN` | the account's workers.dev subdomain without `.workers.dev`              |
| `ANIHUB_PREVIEW_ACCOUNT_ID`    | optional separate preview account                                       |

Previews use placeholder OAuth clients and a fresh `BETTER_AUTH_SECRET` on every run, so sign-in does not work there and production users cannot be reached. Pull requests from forks never deploy.

## First cutover

Run these once, from a local checkout of `main`, with `void cloudflare login` on account `ab6145b5f4d74c798229173319deaf21`:

1. Register `https://anihub.kellycooks.dev/api/auth/callback/google` and `https://anihub.kellycooks.dev/api/auth/callback/discord` with the OAuth providers. See [docs/auth.md](auth.md).
2. In `apps/worker`, bootstrap secrets on the draft Worker: `void secret sync /secure/path/production.env --yes` with `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL=https://anihub.kellycooks.dev` and the four OAuth values.
3. Remove the Vercel DNS record for `anihub.kellycooks.dev` if one still exists, then run `void deploy --platform cloudflare`. This creates `anihub-db`, applies migrations, attaches the custom domain and writes `void.lock.json`.
4. Import legacy data as described in [docs/data-migration.md](data-migration.md).
5. Commit `apps/worker/void.lock.json` to `main` through a pull request.
6. Run `pnpm --filter @anihub/worker smoke https://anihub.kellycooks.dev`.
7. Set `ANIHUB_PRODUCTION_ACTIVE=true`.

## Routine changes

Code-only changes deploy on their own after `Validate` passes on `main`. Commits that `main` has already moved past are skipped, and production runs never cancel each other.

A change with a migration needs the database first, because routine deploys skip migrations:

1. Write the migration so the code already on `main` keeps working against the new schema (add columns and tables; drop them in a later change).
2. After merging, if the automatic deploy fails its smoke test, run `Production migrations` and approve it, then re-run the failed `Production` run.

`migrate.yaml` prints `void db status` before and after it applies migrations.

## Smoke test

`pnpm --filter @anihub/worker smoke <url>` checks `/api/health`, `/api/auth/ok`, the home page, `/sign-in` and the not-found page. It retries each path for about 45 seconds to cover propagation.

## Rollback

Code and data roll back separately:

- Code: `void project rollback --platform cloudflare` from `apps/worker` restores the previous version and its triggers. Set `ANIHUB_PRODUCTION_ACTIVE` to anything but `true` first if the next push would redeploy the broken commit, then revert on `main`.
- Data: `void db restore --platform cloudflare --timestamp <iso-time>` restores `anihub-db` with D1 Time Travel. It discards every write after that time, so prefer a forward migration when the schema change kept old data.
