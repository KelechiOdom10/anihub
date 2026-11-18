import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { z } from "zod";
import {
  catalogPageSchema,
  homeSchema,
  type Anime,
  type CatalogPage,
  type Categories,
  type Home,
} from "../../src/server/anime";
import { chooseCovers } from "../../src/server/genres";

const catalogFixture = z.object({
  pages: z.record(z.string(), catalogPageSchema),
});

const quote = (value: string) => "'" + value.replaceAll("'", "''") + "'";

export default function seedCatalog() {
  const home = homeSchema.parse(
    JSON.parse(
      readFileSync(new URL("../fixtures/home.json", import.meta.url), "utf8")
    )
  );

  const now = Date.now();

  const catalog = catalogFixture.parse(
    JSON.parse(
      readFileSync(new URL("../fixtures/catalog.json", import.meta.url), "utf8")
    )
  );

  const categories = chooseCovers(
    ["Action", "Romance", "Sci-Fi"].map((genre) => ({
      genre,
      anime: catalog.pages[`${genre}:1`]?.anime ?? [],
    }))
  );

  const days = [now, now + 86_400_000].map((time) =>
    new Date(time).toISOString().slice(0, 10)
  );

  const entry = (
    key: string,
    data: Home | CatalogPage | Categories | Anime[] | Anime
  ) =>
    `INSERT INTO cache_entries (key, data, updated_at) VALUES (${quote(key)}, ${quote(JSON.stringify(data))}, ${now});`;

  const anime = new Map(
    [...home.airing, ...home.popular].map((value) => [value.id, value])
  );

  const statements = [
    "DELETE FROM cache_entries;",
    entry("mal:home", home),
    ...Object.entries(catalog.pages).flatMap(([key, page]) =>
      key.startsWith("all:") ? [entry(`mal:catalog:${key.slice(4)}`, page)] : []
    ),
    ...["Action", "Romance", "Sci-Fi"].map((genre) =>
      entry(
        `mal:genre:${genre}`,
        Object.entries(catalog.pages).flatMap(([key, page]) =>
          key.startsWith(`${genre}:`) ? page.anime : []
        )
      )
    ),
    ...days.map((day) => entry(`mal:categories:${day}`, categories)),
    ...[...anime.values()].map((value) =>
      entry(`mal:anime:${value.id}`, value)
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
