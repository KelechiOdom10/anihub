import assert from "node:assert/strict";
import { test } from "node:test";
import { cloudflareTarget, productionAccount } from "../deploy-target";
import { deployProblems, generatedConfig } from "../scripts/deploy-guard";

const productionId = "0f3c3b2a-1111-4222-8333-944445555666";

const previewAccount = "0123456789abcdef0123456789abcdef";

const preview = { kind: "preview", id: "pr-42" } as const;

test("production targets the custom domain and the production database", () => {
  const target = cloudflareTarget(undefined, previewAccount);

  assert.equal(target.name, "anihub");
  assert.equal(target.account_id, productionAccount);
  assert.deepEqual(target.routes, [
    { pattern: "anihub.kellycooks.dev", custom_domain: true },
  ]);
  assert.equal(target.d1_databases[0]?.database_name, "anihub-db");
  assert.deepEqual(
    deployProblems({ kind: "production" }, generatedConfig.parse(target), true),
    []
  );
});

test("previews get their own Worker, database and account with no routes", () => {
  const target = cloudflareTarget("pr-42", previewAccount);

  assert.equal(target.name, "anihub-pr-42");
  assert.equal(target.account_id, previewAccount);
  assert.deepEqual(target.routes, []);
  assert.equal(target.d1_databases[0]?.database_name, "anihub-pr-42-db");
  assert.deepEqual(
    deployProblems(preview, generatedConfig.parse(target), false),
    []
  );
});

test("previews refuse to build without a separate Cloudflare account", () => {
  for (const account of [undefined, "", productionAccount, "not-an-account"])
    assert.throws(() => cloudflareTarget("pr-42", account), String(account));
});

test("preview ids are restricted to pull request numbers", () => {
  for (const id of ["", "main", "pr-0", "pr-1;rm", "PR-1", "pr-01"])
    assert.throws(() => cloudflareTarget(id, previewAccount), id);
});

test("the guard refuses previews that could reach production", () => {
  const target = cloudflareTarget("pr-42", previewAccount);
  const production = generatedConfig.parse(cloudflareTarget(undefined));

  const reused = generatedConfig.parse({
    ...target,
    d1_databases: [
      {
        binding: "DB",
        database_name: "anihub-pr-42-db",
        database_id: productionId,
      },
    ],
  });

  assert.equal(deployProblems(preview, production, false).length, 4);
  assert.match(
    deployProblems(preview, reused, false).join(),
    /real D1 database id/
  );
  assert.match(
    deployProblems(
      preview,
      generatedConfig.parse({ ...target, account_id: productionAccount }),
      false
    ).join(),
    /separate Cloudflare account/
  );
  assert.match(
    deployProblems(preview, generatedConfig.parse(target), true).join(),
    /void.lock.json is present/
  );
});

test("the guard refuses production deploys without the cutover lock, domain or account", () => {
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
  assert.match(
    deployProblems(
      { kind: "production" },
      { ...production, account_id: previewAccount },
      true
    ).join(),
    /production Cloudflare account/
  );
});
