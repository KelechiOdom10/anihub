import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { z } from "zod";

const reportSchema = z.object({
  diagnostics: z.array(z.object({ code: z.string() })),
});

test("the installed CLI rejects fabricated types and accumulator copies, then accepts clean code", () => {
  const directory = mkdtempSync(join(process.cwd(), ".anti-slop-test-"));
  const file = join(directory, "fixture.ts");

  try {
    writeFileSync(
      file,
      'export const fabricated = "text" as unknown as number;\nconst values = [{ id: "a" }];\nexport const copied = values.reduce((all, value) => ({ ...all, [value.id]: value }), {});\n'
    );

    const rejected = spawnSync(
      "./node_modules/.bin/oxlint",
      ["--format", "json", file],
      { encoding: "utf8" }
    );

    const diagnostics = reportSchema.parse(
      JSON.parse(rejected.stdout)
    ).diagnostics;

    assert.equal(rejected.status, 1);
    assert.ok(
      diagnostics.some(
        (value) => value.code === "anti-slop(no-chained-type-assertions)"
      )
    );
    assert.ok(
      diagnostics.some((value) => value.code === "oxc(no-accumulating-spread)")
    );

    writeFileSync(file, 'export const message = "validated";\n');

    const accepted = spawnSync("./node_modules/.bin/oxlint", [file], {
      encoding: "utf8",
    });

    assert.equal(accepted.status, 0, accepted.stdout + accepted.stderr);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
