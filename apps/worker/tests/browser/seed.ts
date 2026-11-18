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

function popularityOrder(lists: Anime[][]) {
  const queues = lists.map((list) => [...list]);
  const pool: Anime[] = [];

  while (queues.some((queue) => queue.length > 0)) {
    const next = queues
      .map((queue) => queue[0])
      .find(
        (head) =>
          head &&
          queues.every(
            (queue) => queue.findIndex((entry) => entry.id === head.id) <= 0
          )
      );

    if (!next) throw new Error("Fixture pages disagree on popularity order");

    pool.push(next);

    for (const queue of queues) if (queue[0]?.id === next.id) queue.shift();
  }

  return pool;
}

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
    data:
      | Home
      | CatalogPage
      | Categories
      | Anime[]
      | Anime
      | { anime: Anime[]; more: boolean }
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
    entry(
      "mal:pool",
      popularityOrder(
        ["all", "Action", "Romance", "Sci-Fi"].map((list) =>
          Object.entries(catalog.pages).flatMap(([key, page]) =>
            key.startsWith(list + ":") ? page.anime : []
          )
        )
      )
    ),
    entry("mal:search:fixture", {
      anime: catalog.pages["all:1"]?.anime ?? [],
      more: false,
    }),
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
