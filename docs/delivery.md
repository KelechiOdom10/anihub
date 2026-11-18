# Delivery

The Worker ships to Cloudflare from GitHub Actions. Four workflows split the work:

| Workflow               | Trigger                                  | Environment                                 | What it does                                                                              |
| ---------------------- | ---------------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `preview.yaml`         | pull request from this repository        | `preview` (required reviewer)               | Deploys `anihub-pr-<n>` with its own `anihub-pr-<n>-db` to a **separate preview account** |
| `preview-cleanup.yaml` | pull request closed                      | `preview-cleanup` (`main` only)             | Deletes the preview Worker and database                                                   |
| `production.yaml`      | `Validate` succeeded on a push to `main` | `production` (`main` only, no reviewer)     | Deploys `anihub` with `--skip-migrations`, then smoke-tests the custom domain             |
| `migrate.yaml`         | manual dispatch on `main`                | `production-migrations` (required reviewer) | Applies pending D1 migrations to `anihub-db`                                              |

Nothing deploys until the repository variables below are set, so merging this layer changes nothing on its own.

## Previews are off by default

Cloud previews only run when `ANIHUB_PREVIEWS=true` **and** `ANIHUB_PREVIEW_ACCOUNT_ID` names a Cloudflare account other than production (`ab6145b5f4d74c798229173319deaf21`). The checked-in workflow condition and `deploy-target.ts` both refuse otherwise. Neither is a security control, because a pull request can edit both. What actually keeps previews off is that `CLOUDFLARE_PREVIEW_API_TOKEN` does not exist until someone creates a token scoped only to the preview account and stores it in the reviewer-gated `preview` environment. An account id in a variable does not limit what a token can do; the token's own account scope does.

The reason: a preview job runs the pull request's own code (its lockfile, install scripts, Vite config and `void deploy`) on the same runner that later receives the preview token. Cloudflare API tokens cannot be narrowed to individual Workers or databases, so whatever account that token can reach, the approved pull request code can reach too. A separate account is the only boundary that keeps it away from `anihub` and `anihub-db`. Using the production account would need Kelechi to explicitly accept that risk and a code change; it is not a configuration option.

Until a preview account exists, preview locally:

```sh
pnpm --filter @anihub/worker build
pnpm --filter @anihub/worker exec void db migrate
pnpm --filter @anihub/worker preview --host 127.0.0.1 --port 8790
pnpm --filter @anihub/worker smoke http://127.0.0.1:8790
```

## Deploy targets and the guard

`void.config.ts` takes its Cloudflare target from `deploy-target.ts`:

- With no `ANIHUB_PREVIEW`, the target is the Worker `anihub` in the production account, the custom domain `anihub.kellycooks.dev` and the database `anihub-db`.
- With `ANIHUB_PREVIEW=pr-<n>`, the target is the Worker `anihub-pr-<n>` in `ANIHUB_PREVIEW_ACCOUNT_ID`, on workers.dev only, with the database `anihub-pr-<n>-db`.

Void adopts an existing D1 database by exact name when no lock entry exists. Previews rely on that: every preview run deletes `void.lock.json` first, so each push reuses its own database.

`pnpm --filter @anihub/worker deploy:guard` reads the generated `dist/server/wrangler.json` and refuses when:

- a preview targets the production account, carries routes, another Worker or database name, a real D1 id, or a `void.lock.json`;
- production targets another account or lacks the `anihub` name, the custom domain, `anihub-db` or the committed `void.lock.json`.

**The guard catches configuration mistakes. It is not a security control.** In a preview, the pull request controls the guard, the build and the deploy command, so only the separate account and the reviewer's approval limit what it can do. `void deploy` also rebuilds after the guard runs (Void cannot skip the build for Worker apps). In production both builds run the same reviewed `main` commit and configuration, though not identical environments: Void provisions and pins the config before its rebuild and strips Cloudflare credentials from the Vite child. Void then checks its rebuilt name, account, routes and binding ids against its own pre-build snapshot. So the guard checks the first build, not the bytes Void uploads, and it only checks that `void.lock.json` exists, not which D1 id it pins.

## Before adding any credential

The workflows assume GitHub settings that do not exist yet. Configure all of them before any Cloudflare token is stored, otherwise a same-repository pull request that edits a workflow could reference an unprotected environment:

1. Protect `main`: pull requests required, no force pushes, `Validate` required.
2. `production`: deployment branch exactly `main`; no required reviewer.
3. `production-migrations`: deployment branch exactly `main`; required reviewer Kelechi; admin bypass disabled.
4. `preview`: required reviewer Kelechi, self-review allowed, admin bypass disabled.
5. `preview-cleanup`: deployment branch exactly `main`.
6. No Actions secrets at repository or organisation level; Cloudflare tokens only in the environments above.

## Trust model

- **Previews run untrusted code.** `pull_request` workflows use the workflow file from the pull request, so a pull request can rewrite `preview.yaml`. All secrets therefore live in environments and none at repository level. `preview` requires a reviewer; `production`, `production-migrations` and `preview-cleanup` only accept `main`, so an edited workflow on another branch cannot reach them. Forks never receive environment secrets and are skipped.
- **Approval covers one commit.** Each preview run belongs to one `pull_request` event, prints its full head SHA and checks out exactly that SHA. Before uploading, it rechecks that the pull request is still open with that same head, so approving an older queued run after a newer push fails instead of deploying stale code. Read the diff of that commit before approving. This recheck lives in the pull request's own workflow file, so it protects against mistakes, not against a hostile pull request; for that, the preview-account-only token is the boundary.
- **No shared artifacts or caches.** No deploy workflow downloads artifacts or uses `actions/cache` or `setup-node` caching, so nothing produced by pull request code feeds a production job.
- **`workflow_run` trust.** `production.yaml` runs from the default branch's copy of the file. It deploys only when the triggering `Validate` run was a `push` to `main` in this repository and succeeded. Activation and the tip of `main` are checked inside the deploy job, once before checkout and again immediately before upload, so re-running a failed job cannot publish a commit that `main` has moved past or deploy while production is paused. It checks out that exact SHA. Pull request runs of `Validate`, including a fork's branch named `main`, are excluded by the event and repository checks.
- **Narrow token exposure.** The Cloudflare token is passed only to the steps that call Cloudflare, not to install, build or smoke steps. In previews this is hygiene only, because earlier steps already ran pull request code on the same runner.
- **Cleanup runs no pull request code.** `preview-cleanup.yaml` uses `pull_request_target`, so GitHub runs it from the default branch's workflow file, and it never checks out the pull request. It shares the per-pull-request concurrency group with preview deploys and confirms the pull request is still closed before deleting anything, so a reopened pull request keeps its preview.
- **Production deploys the latest validated tip, not every SHA.** When several pushes land quickly, GitHub keeps one running and one pending production run and drops older pending ones, and the tip check rejects superseded commits. Every change still reaches production, because the newest tip contains it. Migrations use their own lock, so a migration waiting for approval never blocks deploys.

## Credentials

| Environment             | Secret                         | Scope                                                                                                                                   |
| ----------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `production`            | `CLOUDFLARE_API_TOKEN`         | Production account: Workers Scripts Edit, D1 Edit (try D1 Read after the cutover); zone `kellycooks.dev`: Workers Routes Edit, DNS Edit |
| `production-migrations` | `CLOUDFLARE_API_TOKEN`         | Production account: Workers Scripts Read, D1 Edit                                                                                       |
| `preview`               | `CLOUDFLARE_PREVIEW_API_TOKEN` | Preview account only: Workers Scripts Edit, D1 Edit                                                                                     |
| `preview-cleanup`       | `CLOUDFLARE_PREVIEW_API_TOKEN` | Same token as `preview`                                                                                                                 |

Repository variables:

| Variable                               | Value                                                                   |
| -------------------------------------- | ----------------------------------------------------------------------- |
| `ANIHUB_PRODUCTION_ACTIVE`             | `true` after the first cutover; anything else pauses production deploys |
| `CLOUDFLARE_WORKERS_SUBDOMAIN`         | the production account's workers.dev subdomain without `.workers.dev`   |
| `ANIHUB_PREVIEWS`                      | `true` to enable previews and cleanup                                   |
| `ANIHUB_PREVIEW_ACCOUNT_ID`            | the separate preview account; previews stay off without it              |
| `CLOUDFLARE_PREVIEW_WORKERS_SUBDOMAIN` | the preview account's workers.dev subdomain                             |

Previews use placeholder OAuth clients and a fresh `BETTER_AUTH_SECRET` on every run, so sign-in does not work there and they hold no production data.

## First cutover

Run these once, from a local checkout of `main`, with `void cloudflare login` on the production account:

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

## Smoke test

`pnpm --filter @anihub/worker smoke <url>` checks `/api/health`, `/api/auth/ok`, the home page, `/sign-in` and the not-found page. It retries each path for about 45 seconds to cover propagation.

## Rollback

Code and data roll back separately:

- Code: `void project rollback --platform cloudflare` from `apps/worker` restores the previous version and its triggers. Set `ANIHUB_PRODUCTION_ACTIVE` to anything but `true` first if the next push would redeploy the broken commit, then revert on `main`.
- Data: `void db restore --platform cloudflare --timestamp <iso-time>` restores `anihub-db` with D1 Time Travel. It discards every write after that time, so prefer a forward migration when the schema change kept old data.
