import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { Miniflare } from "miniflare";
import { z } from "zod";
import { createAuth } from "../src/backend/auth";
import type { Env } from "../src/env";

for (const provider of ["discord", "google"])
  test(`verified ${provider} email reclaims the imported id; unverified or missing email cannot link`, async () => {
    const mf = new Miniflare({
      modules: true,
      script: "export default { fetch() { return new Response('ok') } }",
      compatibilityDate: "2026-07-30",
      d1Databases: { DB: "auth-test" },
    });
    try {
      const db = await mf.getD1Database("DB");
      for (const file of (await readdir(new URL("../migrations", import.meta.url)))
        .filter((file) => file.endsWith(".sql"))
        .sort()) {
        const migration = await readFile(new URL("../migrations/" + file, import.meta.url), "utf8");
        for (const statement of migration.split("--> statement-breakpoint"))
          await db.prepare(statement).run();
      }
      await db
        .prepare(
          "INSERT INTO user (id,name,email,email_verified,created_at,updated_at) VALUES (?,?,?,?,?,?)",
        )
        .bind("legacy-6", "Original name", "owner@example.com", 0, Date.now(), Date.now())
        .run();
      const env: Env = {
        DB: db,
        BETTER_AUTH_SECRET: "test-only-secret-at-least-thirty-two-characters",
        BETTER_AUTH_URL: "http://localhost:8787",
        GOOGLE_CLIENT_ID: "test-google",
        GOOGLE_CLIENT_SECRET: "test-google-secret",
        DISCORD_CLIENT_ID: "test-discord",
        DISCORD_CLIENT_SECRET: "test-discord-secret",
      };
      const auth = createAuth(env);
      let verified = true;
      let email: string | null = " OWNER@EXAMPLE.COM ";
      let subject = "123456789012345678";
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (input) => {
        const url =
          typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
        if (url === "https://discord.com/api/oauth2/token")
          return Response.json({
            access_token: "fixture-token",
            token_type: "Bearer",
            expires_in: 3600,
            scope: "identify email",
          });
        if (url === "https://oauth2.googleapis.com/token") {
          const payload = {
            sub: subject,
            email,
            email_verified: verified,
            name: "Fixture",
            aud: "test-google",
            iss: "https://accounts.google.com",
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 3600,
          };
          const idToken =
            Buffer.from(JSON.stringify({ alg: "RS256" })).toString("base64url") +
            "." +
            Buffer.from(JSON.stringify(payload)).toString("base64url") +
            ".fixture";
          return Response.json({
            access_token: "fixture-token",
            id_token: idToken,
            token_type: "Bearer",
            expires_in: 3600,
          });
        }
        if (decodeURIComponent(url) === "https://discord.com/api/users/@me")
          return Response.json({
            id: subject,
            username: "fixture",
            global_name: "Fixture",
            discriminator: "0",
            avatar: null,
            email,
            verified,
          });
        throw new Error("Unexpected provider request in fixture: " + url);
      };
      try {
        async function callback() {
          const start = await auth.handler(
            new Request("http://localhost:8787/api/auth/sign-in/social", {
              method: "POST",
              headers: { "content-type": "application/json", origin: "http://localhost:8787" },
              body: JSON.stringify({ provider, callbackURL: "/", errorCallbackURL: "/sign-in" }),
            }),
          );
          assert.equal(start.status, 200);
          const result = z.object({ url: z.string().url() }).parse(await start.json());
          const state = new URL(result.url).searchParams.get("state");
          assert.ok(state);
          const cookies = start.headers
            .getSetCookie()
            .map((cookie) => cookie.split(";")[0])
            .join("; ");
          return auth.handler(
            new Request(
              "http://localhost:8787/api/auth/callback/" +
                provider +
                "?code=fixture&state=" +
                encodeURIComponent(state),
              { headers: { cookie: cookies } },
            ),
          );
        }
        const accepted = await callback();
        assert.equal(accepted.status, 302);
        assert.equal(accepted.headers.get("location"), "/");
        const linked = await db
          .prepare("SELECT user_id FROM account WHERE provider_id=?")
          .bind(provider)
          .first<{ user_id: string }>();
        assert.equal(linked?.user_id, "legacy-6");
        assert.equal(
          (await db.prepare("SELECT count(*) AS n FROM user").first<{ n: number }>())?.n,
          1,
        );
        assert.equal(
          (await db.prepare("SELECT user_id FROM session").first<{ user_id: string }>())?.user_id,
          "legacy-6",
        );
        verified = false;
        subject = "223456789012345678";
        const rejected = await callback();
        assert.notEqual(rejected.headers.get("location"), "/");
        assert.equal(
          (await db.prepare("SELECT count(*) AS n FROM session").first<{ n: number }>())?.n,
          1,
        );
        assert.equal(
          (await db.prepare("SELECT count(*) AS n FROM account").first<{ n: number }>())?.n,
          1,
        );
        verified = true;
        email = null;
        subject = "323456789012345678";
        const missing = await callback();
        assert.notEqual(missing.headers.get("location"), "/");
        assert.equal(
          (await db.prepare("SELECT count(*) AS n FROM session").first<{ n: number }>())?.n,
          1,
        );
        assert.equal(
          (await db.prepare("SELECT count(*) AS n FROM account").first<{ n: number }>())?.n,
          1,
        );
        await db
          .prepare(
            "INSERT INTO user (id,name,email,email_verified,created_at,updated_at) VALUES (?,?,?,?,?,?)",
          )
          .bind("other-user", "Other owner", "other@example.com", 1, Date.now(), Date.now())
          .run();
        email = "other@example.com";
        subject = "123456789012345678";
        const returned = await callback();
        assert.equal(returned.headers.get("location"), "/");
        assert.equal(
          (
            await db
              .prepare("SELECT user_id FROM account WHERE provider_id=?")
              .bind(provider)
              .first<{ user_id: string }>()
          )?.user_id,
          "legacy-6",
        );
        assert.equal(
          (
            await db
              .prepare("SELECT count(*) AS n FROM session WHERE user_id='other-user'")
              .first<{ n: number }>()
          )?.n,
          0,
        );
        if (provider === "google") {
          const forged = await auth.handler(
            new Request("http://localhost:8787/api/auth/sign-in/social", {
              method: "POST",
              headers: { "content-type": "application/json", origin: "http://localhost:8787" },
              body: JSON.stringify({
                provider,
                idToken: { token: "not-a-valid-jwt" },
                callbackURL: "/",
              }),
            }),
          );
          assert.notEqual(forged.status, 200);
          assert.equal(
            (await db.prepare("SELECT count(*) AS n FROM account").first<{ n: number }>())?.n,
            1,
          );
        }
        const password = await auth.handler(
          new Request("http://localhost:8787/api/auth/sign-in/email", {
            method: "POST",
            headers: { "content-type": "application/json", origin: "http://localhost:8787" },
            body: JSON.stringify({ email: "owner@example.com", password: "never-used" }),
          }),
        );
        assert.notEqual(password.status, 200);
      } finally {
        globalThis.fetch = originalFetch;
      }
    } finally {
      await mf.dispose();
    }
  });
