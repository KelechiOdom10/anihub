import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import libraryConfig from "../library.playwright.config";
import browserConfig from "../playwright.config";

const specDirectory = join(import.meta.dirname, "..", "tests", "browser");

const patterns = (value: string | RegExp | (string | RegExp)[]) =>
  Array.isArray(value) ? value : [value];

const matches = (value: string | RegExp | (string | RegExp)[], name: string) =>
  patterns(value).some((pattern) => pattern.toString().includes(name));

const specs = readdirSync(specDirectory)
  .filter((name) => name.endsWith(".spec.ts"))
  .sort();

assert.ok(specs.length > 0, "No browser specs found.");

assert.ok(browserConfig.testMatch, "The public suite declares no spec files.");

assert.ok(libraryConfig.testIgnore, "The seeded suite excludes no spec files.");

for (const spec of specs) {
  const inBrowser = matches(browserConfig.testMatch, spec);
  const inLibrary = !matches(libraryConfig.testIgnore, spec);

  assert.ok(inBrowser || inLibrary, `${spec} is not run by either suite`);
  assert.ok(
    !(inBrowser && inLibrary),
    `${spec} is run by both suites, which duplicates it`
  );
}

console.log(
  `${specs.length} browser specs are each assigned to exactly one suite.`
);
