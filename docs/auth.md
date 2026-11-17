# Sign-in

The Worker signs people in with Google or Discord through Better Auth 1.7.25 at `/api/auth/*` (`apps/worker/src/routes/api.auth.$.ts`). Void's managed auth is not used because it is unsupported in framework mode. Email/password sign-in and sign-up are disabled.

## Identity rules

- A provider must return an email it has verified (`email_verified` for Google, `verified` for Discord). Otherwise sign-in fails before any user, account or session is written.
- Emails are trimmed and lower-cased; D1 also enforces uniqueness on `lower(trim(email))`.
- A first sign-in whose verified email matches an existing user links to that user. This is how imported legacy accounts are reclaimed.
- After that, the provider subject owns the account. If someone's provider email later changes to another user's address, they still sign in to their own account.
- Google sign-in with a client-supplied ID token is disabled; only the server-side code exchange is accepted.
- Requests carrying cookies must come from the app's own origin, callback URLs must be on the app's origin, and only JSON bodies are accepted.

## Legacy accounts and `requireLocalEmailVerified`

All six legacy users were imported with `email_verified = 0` because the old app never completed verification for them. Better Auth's default refuses to link a provider to an unverified local row, which would lock every legacy user out. `requireLocalEmailVerified: false` allows the link when the provider has verified the email.

The default guards against someone pre-registering an unverified account at another person's address. This app has no unverified sign-up path, so the only such rows are the six imported ones. Better Auth has deprecated this option and plans to make the check unconditional in a later minor release. Before upgrading past 1.7, confirm the legacy users have signed in, or mark them verified through a reviewed migration.

## Configuration

`apps/worker/src/env.ts` declares `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET`. Locally they go in `apps/worker/.env` (git-ignored). In production they are Worker secrets set with `void secret put`. Void validates them at Worker startup and `void deploy` refuses to run without them. The browser smoke test uses placeholder values.

Register these OAuth callback URLs with each provider:

- `https://anihub.kellycooks.dev/api/auth/callback/google`
- `https://anihub.kellycooks.dev/api/auth/callback/discord`

Preview deployments need their own callback registrations or separate preview OAuth clients; the delivery layer owns that.

## Tests

`pnpm --filter @anihub/worker test` runs Better Auth's real handler against a migrated local D1 for both providers. Provider HTTP is stubbed, so live OAuth is not proven until real credentials and callbacks are configured.

## Bundle size

Better Auth raises the compressed Worker from about 94 KiB to about 307 KiB. That is within the 3 MiB Free limit, but it does not prove the 10 ms CPU budget on cold starts; the delivery layer measures that at the edge.
