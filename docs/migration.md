# Turso → D1 cutover

This is a one-time move into an **empty target**, not an ongoing sync. Keep the SQL export private: it contains user emails and authored content. Its file permissions are 0600; *.import.sql is gitignored. Never attach it to a PR or the Captain drive.

## Generate and inspect locally

Provide DATABASE_URL and DATABASE_AUTH_TOKEN in the process environment or a gitignored .env.local. Only the exporter needs them. An existing private env file can be loaded with `pnpm exec tsx --env-file=/private/path/legacy.env scripts/import-turso.ts --output /private/path/anihub.import.sql`.

```sh
pnpm db:import --output /private/path/anihub.import.sql
pnpm db:migrate:local
pnpm exec wrangler d1 execute anihub --local --file /private/path/anihub.import.sql
pnpm exec wrangler d1 execute anihub --local --command 'PRAGMA foreign_key_check;'
```

The exporter:

- Reads all five domain tables in one Turso read transaction; it does not select password hashes or OAuth tokens.
- Refuses normalized-email collisions and refuses to overwrite an existing export file.
- Preserves every user, collection, item, like and comment ID as its original decimal string (including user id zero), all timestamps, privacy flags, images, spoiler flags and reply parents.
- Copies users into Better Auth's user table, normalizing email without changing ownership.
- Resolves unique MAL ids through AniList's idMal and stores validated media in anime_cache. Unresolved ids remain mal_id with anime_id NULL, never a guessed AniList id; the summary reports them for reconciliation.
- Omits all old sessions, password hashes, reset tokens and verification codes. Returning users prove ownership via verified Google/Discord email.
- Aborts if any legacy OAuth bindings exist. The investigated snapshot had zero; if that changes before cutover, reconcile their subject→user ownership explicitly instead of silently discarding it.

The SQL intentionally uses INSERT, not upserts or INSERT OR IGNORE. A nonempty target fails rather than silently merging two user histories. The D1 migration enforces normalized-email uniqueness, collection-item uniqueness, unique likes, provider identity uniqueness and foreign keys. Take a target backup before doing anything with an existing database.

## Production is a separate approval

Do not run --remote while validating this branch. At approved cutover: stop old-app writes, generate a fresh export, verify counts/mappings in a new local D1, create the production D1 and update its ID, apply migrations/import with --remote **only on Kelechi's go**, check foreign keys and compare source/target counts, configure secrets/provider redirects, and deploy only on the specific deployment go.

Local verification used the actual Turso snapshot: 6 users, 10 collections, 29 collection items, 0 likes and 4 comments; 17 unique MAL ids all mapped to AniList. All rows copied to this worktree's local D1 and PRAGMA foreign_key_check returned no rows. No production D1 was created or written. Generate a new export at cutover; these counts are a point-in-time observation, not a future guarantee.
