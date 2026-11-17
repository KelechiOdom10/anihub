import assert from "node:assert/strict";
import { test } from "node:test";
import { cloudflareTarget } from "../deploy-target";
import { deployProblems, generatedConfig } from "../scripts/deploy-guard";

const productionId = "0f3c3b2a-1111-4222-8333-944445555666";

test("production targets the custom domain and the production database", () => {
  const target = cloudflareTarget(undefined);

  assert.equal(target.name, "anihub");
  assert.deepEqual(target.routes, [
    { pattern: "anihub.kellycooks.dev", custom_domain: true },
  ]);
  assert.equal(target.d1_databases[0]?.database_name, "anihub-db");
  assert.deepEqual(
    deployProblems({ kind: "production" }, generatedConfig.parse(target), true),
    []
  );
});

test("previews get their own Worker and database with no routes", () => {
  const target = cloudflareTarget("pr-42");

  assert.equal(target.name, "anihub-pr-42");
  assert.deepEqual(target.routes, []);
  assert.equal(target.d1_databases[0]?.database_name, "anihub-pr-42-db");
  assert.deepEqual(
    deployProblems(
      { kind: "preview", id: "pr-42" },
      generatedConfig.parse(target),
      false
    ),
    []
  );
});

test("previews can move to a separate Cloudflare account", () => {
  assert.equal(
    cloudflareTarget("pr-42").account_id,
    "ab6145b5f4d74c798229173319deaf21"
  );
  assert.equal(
    cloudflareTarget("pr-42", "0123456789abcdef0123456789abcdef").account_id,
    "0123456789abcdef0123456789abcdef"
  );
  assert.equal(
    cloudflareTarget(undefined, "0123456789abcdef0123456789abcdef").account_id,
    "ab6145b5f4d74c798229173319deaf21"
  );
  assert.throws(() => cloudflareTarget("pr-42", "not-an-account"));
});

test("preview ids are restricted to pull request numbers", () => {
  for (const id of ["", "main", "pr-0", "pr-1;rm", "PR-1", "pr-01"])
    assert.throws(() => cloudflareTarget(id), id);
});

test("the guard refuses previews that could reach production", () => {
  const preview = { kind: "preview", id: "pr-42" } as const;
  const production = generatedConfig.parse(cloudflareTarget(undefined));

  const reused = generatedConfig.parse({
    ...cloudflareTarget("pr-42"),
    d1_databases: [
      {
        binding: "DB",
        database_name: "anihub-pr-42-db",
        database_id: productionId,
      },
    ],
  });

  assert.equal(deployProblems(preview, production, false).length, 3);
  assert.match(
    deployProblems(preview, reused, false).join(),
    /real D1 database id/
  );
  assert.match(
    deployProblems(
      preview,
      generatedConfig.parse(cloudflareTarget("pr-42")),
      true
    ).join(),
    /void.lock.json is present/
  );
});

test("the guard refuses production deploys without the cutover lock or domain", () => {
  const production = generatedConfig.parse(cloudflareTarget(undefined));

  assert.match(
    deployProblems({ kind: "production" }, production, false).join(),
    /void.lock.json is missing/
  );
  assert.match(
    deployProblems(
      { kind: "production" },
      { ...production, routes: [] },
      true
    ).join(),
    /Custom domain/
  );
});
