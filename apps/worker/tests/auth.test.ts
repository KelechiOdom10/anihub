import assert from "node:assert/strict";
import { test, type TestContext } from "node:test";
import { z } from "zod";
import { privacyPolicyVersion } from "../src/lib/privacy";
import { createAuth, type AuthSettings } from "../src/server/auth";
import { createTestDatabase } from "./d1";

const origin = "http://localhost:8787";

const settings: AuthSettings = {
  BETTER_AUTH_SECRET: "test-only-secret-with-at-least-thirty-two-characters",
  BETTER_AUTH_URL: origin,
  GOOGLE_CLIENT_ID: "test-google",
  GOOGLE_CLIENT_SECRET: "test-google-secret",
  DISCORD_CLIENT_ID: "test-discord",
  DISCORD_CLIENT_SECRET: "test-discord-secret",
};

type Identity = { subject: string; email: string | null; verified: boolean };

const errorCode = z.object({ code: z.string() });

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

function encode(value: Json) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function stubProviders(t: TestContext, identity: () => Identity) {
  const requests: string[] = [];

  t.mock.method(globalThis, "fetch", async (input: RequestInfo | URL) => {
    const url = decodeURIComponent(
      input instanceof Request ? input.url : input.toString()
    );

    const { subject, email, verified } = identity();

    requests.push(url);

    if (url === "https://discord.com/api/oauth2/token")
      return Response.json({
        access_token: "fixture",
        token_type: "Bearer",
        expires_in: 3600,
      });

    if (url === "https://discord.com/api/users/@me")
      return Response.json({
        id: subject,
        username: "fixture",
        global_name: "Fixture",
        discriminator: "0",
        avatar: null,
        email,
        verified,
      });

    if (url === "https://oauth2.googleapis.com/token") {
      const now = Math.floor(Date.now() / 1000);

      const claims = {
        sub: subject,
        email,
        email_verified: verified,
        name: "Fixture",
        aud: settings.GOOGLE_CLIENT_ID,
        iss: "https://accounts.google.com",
        iat: now,
        exp: now + 3600,
      };

      return Response.json({
        access_token: "fixture",
        id_token: encode({ alg: "RS256" }) + "." + encode(claims) + ".fixture",
        token_type: "Bearer",
        expires_in: 3600,
      });
    }

    throw new Error("Unexpected outbound request: " + url);
  });

  return requests;
}

type SignInBody = {
  provider: string;
  callbackURL: string;
  errorCallbackURL: string;
  additionalData?: { privacyConsent: string };
};

async function signIn(
  auth: ReturnType<typeof createAuth>,
  provider: string,
  consent: string | null = privacyPolicyVersion
) {
  const body: SignInBody = {
    provider,
    callbackURL: "/",
    errorCallbackURL: "/sign-in",
  };

  if (consent !== null) body.additionalData = { privacyConsent: consent };

  const start = await auth.handler(
    new Request(origin + "/api/auth/sign-in/social", {
      method: "POST",
      headers: { "content-type": "application/json", origin },
      body: JSON.stringify(body),
    })
  );

  assert.equal(start.status, 200);

  const { url } = z.object({ url: z.url() }).parse(await start.json());
  const state = z.string().parse(new URL(url).searchParams.get("state"));

  const cookie = start.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");

  const callback = await auth.handler(
    new Request(
      `${origin}/api/auth/callback/${provider}?code=fixture&state=${encodeURIComponent(state)}`,
      {
        headers: { cookie },
      }
    )
  );

  return callback.headers.get("location");
}

for (const provider of ["google", "discord"])
  test(`${provider} sign-in reclaims accounts only through verified provider email and subject`, async (t) => {
    const { d1, dispose } = await createTestDatabase();

    const count = async (sql: string) =>
      z.number().parse(await d1.prepare(sql).first("n"));

    let identity: Identity = {
      subject: "1001",
      email: " OWNER@Example.com ",
      verified: true,
    };

    const requests = stubProviders(t, () => identity);
    const auth = createAuth(d1, settings);

    const insertUser =
      "INSERT INTO user (id, name, email, email_verified, created_at, updated_at) VALUES (?, ?, ?, ?, 1, 1)";

    try {
      await d1
        .prepare(insertUser)
        .bind("legacy-6", "Original", "owner@example.com", 0)
        .run();

      assert.equal(await signIn(auth, provider), "/");
      assert.equal(
        await d1.prepare("SELECT user_id FROM account").first("user_id"),
        "legacy-6"
      );
      assert.equal(
        await d1.prepare("SELECT user_id FROM session").first("user_id"),
        "legacy-6"
      );
      assert.equal(await count("SELECT count(*) AS n FROM user"), 1);

      identity = {
        subject: "1002",
        email: "stranger@example.com",
        verified: false,
      };
      assert.notEqual(await signIn(auth, provider), "/");

      identity = { subject: "1003", email: null, verified: true };
      assert.notEqual(await signIn(auth, provider), "/");
      assert.equal(await count("SELECT count(*) AS n FROM session"), 1);
      assert.equal(await count("SELECT count(*) AS n FROM account"), 1);
      assert.equal(await count("SELECT count(*) AS n FROM user"), 1);

      await d1
        .prepare(insertUser)
        .bind("other", "Other", "other@example.com", 1)
        .run();
      identity = {
        subject: "1001",
        email: "other@example.com",
        verified: true,
      };
      assert.equal(await signIn(auth, provider), "/");
      assert.equal(
        await count(
          "SELECT count(*) AS n FROM session WHERE user_id = 'legacy-6'"
        ),
        2
      );
      assert.equal(
        await count(
          "SELECT count(*) AS n FROM session WHERE user_id = 'other'"
        ),
        0
      );

      identity = {
        subject: "1004",
        email: "New.Person@Example.com",
        verified: true,
      };
      assert.equal(await signIn(auth, provider), "/");
      assert.equal(
        await d1
          .prepare(
            "SELECT email FROM user WHERE id NOT IN ('legacy-6', 'other')"
          )
          .first("email"),
        "new.person@example.com"
      );
      assert.ok(
        requests.every((url) => !url.includes("googleapis.com/oauth2/v3/certs"))
      );
    } finally {
      await dispose();
    }
  });

test("direct ID tokens, passwords, cross-site requests and foreign callbacks are refused", async (t) => {
  const { d1, dispose } = await createTestDatabase();

  const requests = stubProviders(t, () => ({
    subject: "1",
    email: "a@example.com",
    verified: true,
  }));

  const auth = createAuth(d1, settings);

  const post = (
    path: string,
    body: Json,
    headers: Record<string, string> = { origin }
  ) =>
    auth.handler(
      new Request(origin + path, {
        method: "POST",
        headers: { "content-type": "application/json", ...headers },
        body: JSON.stringify(body),
      })
    );

  const start = { provider: "google", callbackURL: "/" };
  const cookie = "better-auth.session_token=fixture";

  try {
    const forged = await post("/api/auth/sign-in/social", {
      provider: "google",
      idToken: {
        token:
          encode({ alg: "none" }) +
          "." +
          encode({ sub: "1", email: "a@example.com" }) +
          ".",
      },
    });

    const password = await post("/api/auth/sign-in/email", {
      email: "a@example.com",
      password: "unused-password",
    });

    const signUp = await post("/api/auth/sign-up/email", {
      name: "A",
      email: "a@example.com",
      password: "unused-password",
    });

    const crossSite = await post("/api/auth/sign-in/social", start, {
      origin: "https://attacker.example",
      cookie,
    });

    const missingOrigin = await post("/api/auth/sign-in/social", start, {
      cookie,
    });

    const foreignCallback = await post("/api/auth/sign-in/social", {
      provider: "google",
      callbackURL: "https://attacker.example/steal",
    });

    const form = await auth.handler(
      new Request(origin + "/api/auth/sign-in/social", {
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          origin: "https://attacker.example",
          cookie,
        },
        body: new URLSearchParams(start).toString(),
      })
    );

    assert.notEqual(forged.status, 200);
    assert.deepEqual(errorCode.parse(await password.json()), {
      code: "EMAIL_PASSWORD_DISABLED",
    });
    assert.deepEqual(errorCode.parse(await signUp.json()), {
      code: "EMAIL_PASSWORD_SIGN_UP_DISABLED",
    });
    assert.equal(
      await d1.prepare("SELECT count(*) AS n FROM user").first("n"),
      0
    );
    assert.equal(crossSite.status, 403);
    assert.equal(missingOrigin.status, 403);
    assert.equal(foreignCallback.status, 403);
    assert.equal(form.status, 415);
    assert.equal(
      await d1.prepare("SELECT count(*) AS n FROM session").first("n"),
      0
    );
    assert.deepEqual(requests, []);
  } finally {
    await dispose();
  }
});

for (const provider of ["google", "discord"])
  test(`${provider} sign-up needs privacy consent and stores no tokens or picture`, async (t) => {
    const { d1, dispose } = await createTestDatabase();

    const count = async (sql: string) =>
      z.number().parse(await d1.prepare(sql).first("n"));

    stubProviders(t, () => ({
      subject: "2001",
      email: "new@example.com",
      verified: true,
    }));

    const auth = createAuth(d1, settings);

    try {
      for (const consent of [null, "an-older-version"]) {
        assert.notEqual(await signIn(auth, provider, consent), "/");
        assert.equal(await count("SELECT count(*) AS n FROM user"), 0);
        assert.equal(await count("SELECT count(*) AS n FROM account"), 0);
      }

      assert.equal(await signIn(auth, provider), "/");
      assert.deepEqual(
        await d1
          .prepare("SELECT image, privacy_policy_version AS version FROM user")
          .first(),
        { image: null, version: privacyPolicyVersion }
      );
      assert.ok(
        await d1
          .prepare("SELECT privacy_consented_at FROM user")
          .first("privacy_consented_at")
      );
      assert.equal(
        await count(
          "SELECT count(*) AS n FROM account WHERE access_token IS NOT NULL OR refresh_token IS NOT NULL OR id_token IS NOT NULL"
        ),
        0
      );
    } finally {
      await dispose();
    }
  });

test("imported users can still sign in, and their consent is recorded only when given", async (t) => {
  const { d1, dispose } = await createTestDatabase();

  stubProviders(t, () => ({
    subject: "3001",
    email: "legacy@example.com",
    verified: true,
  }));

  const auth = createAuth(d1, settings);

  const version = () =>
    d1.prepare("SELECT privacy_policy_version AS v FROM user").first("v");

  try {
    await d1
      .prepare(
        "INSERT INTO user (id, name, email, email_verified, created_at, updated_at) VALUES ('legacy', 'Legacy', 'legacy@example.com', 0, 1, 1)"
      )
      .run();

    assert.equal(await signIn(auth, "discord", null), "/");
    assert.equal(await version(), null);

    assert.equal(await signIn(auth, "discord"), "/");
    assert.equal(await version(), privacyPolicyVersion);
  } finally {
    await dispose();
  }
});
