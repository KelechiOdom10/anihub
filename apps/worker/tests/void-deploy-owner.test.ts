import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createCloudflareMetadataRunner,
  verifyPublishedCloudflareOwner,
} from "@void/deploy-cloudflare";

const accountId = "0123456789abcdef0123456789abcdef";
const workerName = "anihub";
const configPath = "/tmp/anihub/wrangler.json";
const previous = "11111111-1111-4111-8111-111111111111";
const published = "22222222-2222-4222-8222-222222222222";
const other = "33333333-3333-4333-8333-333333333333";

type Traffic = Array<{ version_id: string; percentage: number }>;

function guard(reads: Traffic[]) {
  const requests: string[] = [];
  const pauses: number[] = [];

  const fetch: typeof globalThis.fetch = async (input) => {
    const url = input instanceof Request ? input.url : String(input);

    requests.push(url);
    assert.equal(
      url,
      `https://api.cloudflare.test/client/v4/accounts/${accountId}/workers/scripts/${workerName}/deployments`
    );
    const versions = reads[Math.min(requests.length, reads.length) - 1];

    return Response.json({
      success: true,
      result: { deployments: [{ versions }] },
    });
  };

  const runWrangler = createCloudflareMetadataRunner({
    runWrangler: async () => {
      throw new Error("the CLI must not run");
    },
    accountId,
    apiBaseUrl: "https://api.cloudflare.test/client/v4",
    workerName,
    configPath,
    getToken: async () => "synthetic-token",
    verifyUploader: () => true,
    fetch,
    env: {},
  });

  const options = {
    runWrangler,
    configPath,
    workerName,
    sleep: async (milliseconds: number) => {
      pauses.push(milliseconds);
    },
    publicationConfirmAttempts: 3,
    publicationConfirmDelayMs: 5,
  };

  return {
    verify: () => verifyPublishedCloudflareOwner(options, published, previous),
    requests,
    pauses,
  };
}

const only = (version_id: string): Traffic => [{ version_id, percentage: 100 }];

test("a stale read of the previous version passes once the new version owns all traffic", async () => {
  const { verify, requests, pauses } = guard([only(previous), only(published)]);

  assert.equal(await verify(), null);
  assert.equal(requests.length, 2);
  assert.deepEqual(pauses, [5]);
});

test("the previous version still owning traffic after every read fails", async () => {
  const { verify, requests } = guard([only(previous)]);

  assert.deepEqual(await verify(), {
    ok: false,
    reason: "deployment-changed",
    versionId: published,
    previousVersionId: previous,
    activeVersionId: previous,
    rollback: "not-needed",
  });
  assert.equal(requests.length, 3);
});

test("a third version owning traffic fails without polling", async () => {
  const { verify, requests } = guard([only(other), only(published)]);

  assert.deepEqual(await verify(), {
    ok: false,
    reason: "deployment-changed",
    versionId: published,
    previousVersionId: previous,
    activeVersionId: other,
    rollback: "not-needed",
  });
  assert.equal(requests.length, 1);
});

test("split traffic fails without polling", async () => {
  const { verify, requests } = guard([
    [
      { version_id: previous, percentage: 50 },
      { version_id: published, percentage: 50 },
    ],
    only(published),
  ]);

  assert.deepEqual(await verify(), {
    ok: false,
    reason: "deployment-changed",
    versionId: published,
    previousVersionId: previous,
    activeVersionId: null,
    rollback: "not-needed",
  });
  assert.equal(requests.length, 1);
});
