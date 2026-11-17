# Data layer

The Workers candidate stores its data in D1 using Void's database conventions. The schema is `apps/worker/src/db/schema.ts`; reviewed migrations are generated into `apps/worker/src/db/migrations` with `pnpm --filter @anihub/worker exec void db generate`. Generation needs no Cloudflare credentials.

## Schema

- Better Auth's `user`, `session`, `account` and `verification` tables. There is no password column: sign-in is Google and Discord only. A unique index on `lower(trim(email))` stops two accounts differing only by email case or whitespace.
- Imported legacy `collections`, `collection_items`, `collection_likes` and `comments`. Legacy rows referenced MyAnimeList ids, so each row keeps `mal_id` and stores the resolved AniList id in `anime_id`, which stays null when AniList has no mapping.
- `anime_cache` and `cache_entries` hold public AniList data only. Upstream responses are parsed against the public anime contract before caching, so extra fields never reach D1.

## AniList catalog

`apps/worker/src/server/catalog.ts` serves home lists for an hour and individual anime for a day from D1. When AniList times out, errors or returns an unexpected shape, the last cached copy is served; without one the call fails with `AnimeUnavailableError`. A missing anime resolves to null and is not cached.

## Legacy export

`pnpm --filter @anihub/worker export:legacy --output /private/path/anihub.import.sql` reads one Turso snapshot using `DATABASE_URL` and `DATABASE_AUTH_TOKEN` from the shell, maps MyAnimeList ids through AniList and writes an owner-only SQL file. It performs no D1 writes. The file contains personal data: keep it outside the repository and Drive.

The export refuses to run when legacy users collide after email normalisation, when any email or timestamp is malformed, or when legacy OAuth bindings exist whose identity continuity has not been reconciled. It reports unresolved MyAnimeList ids rather than guessing.

Applying the file to a production database is a separate, explicitly approved step owned by the delivery layer.

## Tests

`pnpm --filter @anihub/worker test` applies the generated migrations to a fresh local D1 in Miniflare and covers the import, the email uniqueness index, the cache freshness and stale-fallback rules, upstream failures and anime id validation. No network or credentials are used.
