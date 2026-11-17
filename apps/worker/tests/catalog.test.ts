import assert from "node:assert/strict";
import { test } from "node:test";
import { animeCache } from "../src/db/schema";
import { animeIdSchema, type Anime } from "../src/server/anime";
import {
  AnimeUnavailableError,
  loadAnime,
  loadHome,
  type CatalogSource,
} from "../src/server/catalog";
import { createTestDatabase } from "./d1";

const anime: Anime = {
  id: 21,
  idMal: 21,
  title: { romaji: "One Piece", english: "One Piece" },
  description: "Pirates",
  coverImage: { extraLarge: "https://example.com/one-piece.jpg" },
  bannerImage: null,
  averageScore: 88,
  episodes: null,
  seasonYear: 1999,
  format: "TV",
  status: "RELEASING",
  genres: ["Adventure"],
  studios: { nodes: [{ name: "Toei Animation" }] },
};

type Upstream = () => Promise<Response>;

async function withCatalog(
  run: (context: {
    source: CatalogSource;
    calls: () => number;
    respond: (next: Upstream) => void;
    now: (value: number) => void;
  }) => Promise<void>
) {
  const { db, dispose } = await createTestDatabase();
  let upstream: Upstream = () => Promise.resolve(Response.json({}));
  let clock = 1_000_000;
  let calls = 0;

  const source: CatalogSource = {
    db,
    fetch: () => {
      calls += 1;

      return upstream();
    },
    now: () => clock,
  };

  try {
    await run({
      source,
      calls: () => calls,
      respond: (next) => {
        upstream = next;
      },
      now: (value) => {
        clock = value;
      },
    });
  } finally {
    await dispose();
  }
}

const media = (value: Anime) =>
  Promise.resolve(Response.json({ data: { Media: value } }));

test("anime is fetched once, cached in D1, then served fresh without calling AniList", async () => {
  await withCatalog(async ({ source, calls, respond }) => {
    respond(() => media(anime));

    assert.deepEqual(await loadAnime(source, 21), anime);
    assert.deepEqual(await loadAnime(source, 21), anime);
    assert.equal(calls(), 1);
  });
});

test("only the public anime contract is cached, never extra upstream fields", async () => {
  await withCatalog(async ({ source, respond }) => {
    respond(() =>
      Promise.resolve(
        Response.json({
          data: { Media: { ...anime, mediaListEntry: { status: "PRIVATE" } } },
        })
      )
    );
    await loadAnime(source, 21);

    const [row] = await source.db.select().from(animeCache);

    assert.deepEqual(row?.data, anime);
  });
});

test("stale anime is served when AniList times out, and refreshed once it recovers", async () => {
  await withCatalog(async ({ source, respond, now }) => {
    respond(() => media(anime));
    await loadAnime(source, 21);
    now(1_000_000 + 86_400_001);
    respond(() =>
      Promise.reject(new DOMException("timed out", "TimeoutError"))
    );

    assert.deepEqual(await loadAnime(source, 21), anime);

    const renamed = { ...anime, title: { ...anime.title, english: "Renamed" } };

    respond(() => media(renamed));

    assert.deepEqual(await loadAnime(source, 21), renamed);
  });
});

test("upstream failures without a cached copy surface as unavailable", async () => {
  await withCatalog(async ({ source, respond }) => {
    respond(() => Promise.resolve(new Response("busy", { status: 503 })));
    await assert.rejects(loadAnime(source, 21), AnimeUnavailableError);

    respond(() =>
      Promise.resolve(Response.json({ data: { Media: { id: "broken" } } }))
    );
    await assert.rejects(loadAnime(source, 21), AnimeUnavailableError);

    respond(() => Promise.resolve(new Response("<html>", { status: 200 })));
    await assert.rejects(loadHome(source), AnimeUnavailableError);
  });
});

test("missing anime resolves to null and caches nothing", async () => {
  await withCatalog(async ({ source, respond }) => {
    respond(() =>
      Promise.resolve(Response.json({ data: { Media: null } }, { status: 404 }))
    );

    assert.equal(await loadAnime(source, 999999), null);
    assert.equal((await source.db.select().from(animeCache)).length, 0);
  });
});

test("home lists are cached for an hour and served stale during an outage", async () => {
  await withCatalog(async ({ source, calls, respond, now }) => {
    respond(() =>
      Promise.resolve(
        Response.json({
          data: { trending: { media: [anime] }, popular: { media: [] } },
        })
      )
    );

    assert.deepEqual(await loadHome(source), {
      trending: [anime],
      popular: [],
    });
    await loadHome(source);
    assert.equal(calls(), 1);

    now(1_000_000 + 3_600_001);
    respond(() => Promise.reject(new TypeError("network down")));

    assert.deepEqual(await loadHome(source), {
      trending: [anime],
      popular: [],
    });
    assert.equal(calls(), 2);
  });
});

test("anime ids accept positive 32-bit integers only", () => {
  assert.equal(animeIdSchema.parse("21"), 21);

  for (const value of ["0", "-1", "1.5", "abc", "2147483648", ""])
    assert.equal(animeIdSchema.safeParse(value).success, false, value);
});
