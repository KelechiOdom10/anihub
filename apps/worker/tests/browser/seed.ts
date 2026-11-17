import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homeSchema } from "../../src/server/anime";

const quote = (value: string) => "'" + value.replaceAll("'", "''") + "'";

export default function seedCatalog() {
  const home = homeSchema.parse(
    JSON.parse(
      readFileSync(new URL("../fixtures/home.json", import.meta.url), "utf8")
    )
  );

  const now = Date.now();

  const anime = new Map(
    [...home.trending, ...home.popular].map((value) => [value.id, value])
  );

  const statements = [
    "DELETE FROM cache_entries;",
    "DELETE FROM anime_cache;",
    `INSERT INTO cache_entries (key, data, updated_at) VALUES ('home', ${quote(JSON.stringify(home))}, ${now});`,
    ...[...anime.values()].map(
      (value) =>
        `INSERT INTO anime_cache (id, mal_id, data, updated_at) VALUES (${value.id}, ${value.idMal ?? "NULL"}, ${quote(JSON.stringify(value))}, ${now});`
    ),
  ];

  mkdirSync(".void", { recursive: true });
  writeFileSync(".void/browser-seed.sql", statements.join("\n"));
  execFileSync("pnpm", ["exec", "void", "db", "migrate"], { stdio: "inherit" });
  execFileSync(
    "pnpm",
    ["exec", "void", "db", "execute", "--file", ".void/browser-seed.sql"],
    {
      stdio: "inherit",
    }
  );
}
