# Data layer

The Workers candidate stores its data in D1 using Void's database conventions. The schema is `apps/worker/src/db/schema.ts`; reviewed migrations are generated into `apps/worker/src/db/migrations` with `pnpm --filter @anihub/worker exec void db generate`. Generation needs no Cloudflare credentials.

## Schema

- Better Auth's `user`, `session`, `account` and `verification` tables. Sign-in is Google and Discord only. `account.password` exists only because Better Auth's Drizzle adapter refuses to start without it; it is never written, and email/password endpoints are disabled. A unique index on `lower(trim(email))` stops two accounts differing only by email case or whitespace.
- Imported legacy `collections`, `collection_items`, `collection_likes` and `comments`. Legacy rows referenced MyAnimeList ids, which each row keeps in `mal_id`. `anime_id` held AniList ids until the `clear_anilist` migration set it to null; it is unused and will be dropped in a later migration.
- `anime_cache` and `cache_entries` hold public MyAnimeList anime data only, never MyAnimeList user data. Upstream responses are parsed against the public anime contract before caching, so extra fields never reach D1.

## MyAnimeList catalog

`apps/worker/src/server/catalog.ts` serves home lists for an hour and individual anime for a day from D1. Requests use the official MyAnimeList API v2 with the `MAL_CLIENT_ID` Worker secret in the `X-MAL-CLIENT-ID` header. When MyAnimeList times out, errors or returns an unexpected shape, the last cached copy is served; without one the call fails with `AnimeUnavailableError`. A missing (404) or Rx-rated anime resolves to null and its cached copy is deleted, so a later outage cannot bring it back. Rx-rated titles are also filtered out of every ranking list. Requests never follow redirects, so the client ID is only ever sent to `api.myanimelist.net`.

Every MyAnimeList cache row lives in `cache_entries` under a `mal:` key (`mal:home`, `mal:anime:<id>`, `mal:catalog:<page>`, `mal:pool`, `mal:genre:<name>`, `mal:categories:<day>`). The prefix keeps them apart from anything the AniList version wrote. `anime_cache` is no longer used and will be dropped in a later migration.

### Removing a title on request

The MyAnimeList API agreement (§3(e)) requires removing or correcting MyAnimeList content within 24 hours of a request from MyAnimeList or the affected user. Kelechi owns this. Delete the cached copies so they are refetched (a removed title then 404s and stays out):

```sh
cd apps/worker
pnpm exec void db execute --remote "DELETE FROM cache_entries WHERE key = 'mal:anime:<id>' OR key IN ('mal:home', 'mal:pool') OR key LIKE 'mal:catalog:%' OR key LIKE 'mal:genre:%' OR key LIKE 'mal:categories:%'"
```

This never touches user, collection, item, like or comment rows.

Then check the removal held: open `/anime/<id>` (expect 404 or the corrected text), the home page and the genre pages the title belonged to. Ranking lists are refetched independently of the detail page, so if MyAnimeList still lists the title there, or a refresh that was in flight brought it back, filter that id out in `apps/worker/src/server/catalog.ts` (detail and `loadList`), deploy, and run the delete again. Tell MyAnimeList when its API still serves content it asked AniHub to remove.

## Legacy export

`pnpm --filter @anihub/worker export:legacy --output /private/path/anihub.import.sql` reads one Turso snapshot using `DATABASE_URL` and `DATABASE_AUTH_TOKEN` from the shell, and writes an owner-only SQL file. It performs no D1 writes. The file contains personal data: keep it outside the repository and Drive.

The export refuses to run when legacy users collide after email normalisation, when any email or timestamp is malformed, or when legacy OAuth bindings exist whose identity continuity has not been reconciled. It reports unresolved MyAnimeList ids rather than guessing.

Applying the file to a production database is a separate, explicitly approved step owned by the delivery layer.

## Tests

`pnpm --filter @anihub/worker test` applies the generated migrations to a fresh local D1 in Miniflare and covers the import, the email uniqueness index, the cache freshness and stale-fallback rules, upstream failures and anime id validation. No network or credentials are used.
