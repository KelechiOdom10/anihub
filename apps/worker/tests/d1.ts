import { readdir, readFile } from "node:fs/promises";
import { Miniflare } from "miniflare";
import { drizzle } from "drizzle-orm/d1";

const migrationsDir = new URL("../src/db/migrations/", import.meta.url);

export async function createTestDatabase() {
  const miniflare = new Miniflare({
    modules: true,
    script: "export default { fetch: () => new Response(null) }",
    d1Databases: { DB: "test" },
  });

  const d1 = await miniflare.getD1Database("DB");

  const files = (await readdir(migrationsDir))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const sql = await readFile(new URL(file, migrationsDir), "utf8");

    await d1.batch(
      sql
        .split("--> statement-breakpoint")
        .map((statement) => statement.trim())
        .filter(Boolean)
        .map((statement) => d1.prepare(statement))
    );
  }

  return { d1, db: drizzle(d1), dispose: () => miniflare.dispose() };
}
