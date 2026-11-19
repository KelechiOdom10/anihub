import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { defaultAvatar, publicIdentity } from "../src/lib/identity";

const workerRoot = join(import.meta.dirname, "..");

const assetPath = (directory: string) =>
  join(workerRoot, directory, defaultAvatar.slice(1));

test("the default avatar exists in the public directory and the built assets", () => {
  assert.ok(
    defaultAvatar.startsWith("/"),
    "the default avatar must be root-relative"
  );
  assert.ok(
    existsSync(assetPath("public")),
    `${defaultAvatar} is missing from apps/worker/public, so every fallback avatar would 404`
  );
  assert.ok(
    existsSync(assetPath(join("dist", "client"))),
    `${defaultAvatar} is missing from the built assets; run the build before the test`
  );
});

test("the avatar stored by older rows still resolves to a served file", () => {
  assert.ok(
    existsSync(join(workerRoot, "public", "anime-female-avatar.png")),
    "rows seeded with /anime-female-avatar.png render a broken image without this file"
  );
});

test("an untrusted provider image falls back to the served avatar", () => {
  const trusted = publicIdentity({
    name: "Kelechi",
    image: "https://lh3.googleusercontent.com/a/example",
  });

  const untrusted = publicIdentity({
    name: "Kelechi",
    image: "https://s3.nyeki.dev/example.jpg",
  });

  const missing = publicIdentity({ name: "Kelechi", image: null });

  assert.match(trusted.avatar, /^https:\/\/lh3\.googleusercontent\.com\//);
  assert.equal(untrusted.avatar, defaultAvatar);
  assert.equal(missing.avatar, defaultAvatar);
});
