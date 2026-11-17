import assert from "node:assert/strict";
import { test } from "node:test";
import { z } from "zod";
import { animeCache } from "../src/db/schema";
import { animeIdSchema, type Anime } from "../src/server/anime";
import {
  AnimeUnavailableError,
  loadAnime,
  loadCatalog,
  loadCategories,
  loadHome,
  type CatalogSource,
} from "../src/server/catalog";
import {
  chooseCovers,
  legacyGenreIds,
  pickCategories,
} from "../src/server/genres";
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
  startDate: { year: 1999, month: 10, day: 20 },
  endDate: { year: null, month: null, day: null },
  format: "TV",
  status: "RELEASING",
  genres: ["Adventure"],
  studios: { nodes: [{ name: "Toei Animation" }] },
};

type Upstream = (init?: RequestInit) => Promise<Response>;

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
    fetch: (_input, init) => {
      calls += 1;

      return upstream(init);
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

const genreList = [
  "Action",
  "Adventure",
  "Comedy",
  "Drama",
  "Hentai",
  "Romance",
];

const aniListRequest = z.object({
  query: z.string(),
  variables: z.object({
    genre: z.string().optional(),
    page: z.number().optional(),
  }),
});

function aniList(init?: RequestInit) {
  const { query, variables } = aniListRequest.parse(
    JSON.parse(String(init?.body))
  );

  if (query.includes("GenreCollection"))
    return Promise.resolve(
      Response.json({ data: { GenreCollection: genreList } })
    );

  const genre = variables.genre ?? "All";

  return Promise.resolve(
    Response.json({
      data: {
        Page: {
          pageInfo: { hasNextPage: true },
          media: [1, 2, 3, 4].map((index) => ({
            ...anime,
            id:
              (genreList.indexOf(genre) + 2) * 100 +
              (variables.page ?? 1) * 10 +
              index,
            title: { romaji: `${genre} ${index}`, english: null },
            genres: [genre],
          })),
        },
      },
    })
  );
}

test("categories are three distinct genres, stable for a day and independent of list order", () => {
  const genres = ["Action", "Comedy", "Drama", "Fantasy", "Romance", "Sports"];
  const picked = pickCategories(genres, "2026-11-17");

  assert.equal(picked.length, 3);
  assert.equal(new Set(picked).size, 3);
  assert.ok(picked.every((genre) => genres.includes(genre)));
  assert.deepEqual(pickCategories([...genres].reverse(), "2026-11-17"), picked);

  const days = Array.from({ length: 10 }, (_, day) =>
    pickCategories(genres, `2026-12-${String(day + 1).padStart(2, "0")}`).join()
  );

  assert.ok(new Set(days).size > 1);
});

test("home categories show covers from their own genre and are cached for the day", async () => {
  await withCatalog(async ({ source, calls, respond, now }) => {
    now(Date.parse("2026-11-17T12:00:00Z"));
    respond(aniList);

    const categories = await loadCategories(source);

    assert.equal(categories.length, 3);

    for (const { genre, anime: covers } of categories) {
      assert.notEqual(genre, "Hentai");
      assert.equal(covers.length, 3);
      assert.ok(covers.every((entry) => entry.genres.includes(genre)));
    }

    const ids = categories.flatMap((category) =>
      category.anime.map((entry) => entry.id)
    );

    assert.equal(new Set(ids).size, ids.length);

    const before = calls();

    assert.deepEqual(await loadCategories(source), categories);
    assert.equal(calls(), before);
  });
});

test("categories disappear instead of breaking home when AniList is down with no cache", async () => {
  await withCatalog(async ({ source, respond }) => {
    respond(() => Promise.resolve(new Response("busy", { status: 503 })));

    assert.deepEqual(await loadCategories(source), []);
  });
});

test("catalog results come from the requested genre, cached per genre and page", async () => {
  await withCatalog(async ({ source, calls, respond }) => {
    const requested: Array<string | undefined> = [];

    respond((init) => {
      const { variables } = aniListRequest.parse(
        JSON.parse(String(init?.body))
      );

      requested.push(variables.genre);

      return aniList(init);
    });

    const romance = await loadCatalog(source, { genres: "Romance", page: 1 });

    assert.equal(romance.kind, "results");
    assert.ok(
      romance.kind === "results" &&
        romance.anime.every((entry) => entry.genres.includes("Romance"))
    );

    const before = calls();

    assert.deepEqual(
      await loadCatalog(source, { genres: "Romance", page: 1 }),
      romance
    );
    assert.equal(calls(), before);

    const all = await loadCatalog(source, { page: 2 });

    assert.ok(
      all.kind === "results" && all.genre === null && all.anime.length === 4
    );
    assert.deepEqual(requested, [undefined, "Romance", undefined]);
  });
});

test("legacy MAL genre ids redirect to their AniList genre without calling AniList", async () => {
  await withCatalog(async ({ source, calls }) => {
    assert.deepEqual(await loadCatalog(source, { genres: "1", page: 1 }), {
      kind: "redirect",
      genre: "Action",
    });
    assert.deepEqual(await loadCatalog(source, { genres: "66", page: 1 }), {
      kind: "redirect",
      genre: "Mahou Shoujo",
    });
    assert.equal(calls(), 0);
  });
});

test("a cover already shown on an earlier card is skipped for the next genre", () => {
  const shared = { ...anime, id: 1, genres: ["Action", "Drama"] };
  const drama = { ...anime, id: 2, genres: ["Drama"] };

  const categories = chooseCovers([
    { genre: "Action", anime: [shared] },
    { genre: "Drama", anime: [shared, drama] },
  ]);

  assert.deepEqual(
    categories.map((category) => category.anime.map((entry) => entry.id)),
    [[1], [2]]
  );
});

test("unsupported genre values are reported instead of showing unrelated results", async () => {
  await withCatalog(async ({ source, respond }) => {
    respond(aniList);

    for (const value of ["41", "62", "12", "1,4", "Isekai", "Hentai", "action"])
      assert.deepEqual(await loadCatalog(source, { genres: value, page: 1 }), {
        kind: "unsupported",
        value,
      });
  });
});

test("every legacy id maps to a genre AniList actually lists", () => {
  const aniListGenres = new Set([
    "Action",
    "Adventure",
    "Comedy",
    "Drama",
    "Ecchi",
    "Fantasy",
    "Horror",
    "Mahou Shoujo",
    "Mecha",
    "Music",
    "Mystery",
    "Psychological",
    "Romance",
    "Sci-Fi",
    "Slice of Life",
    "Sports",
    "Supernatural",
    "Thriller",
  ]);

  for (const genre of legacyGenreIds.values())
    assert.ok(aniListGenres.has(genre), genre);
});

test("a stale catalog page is served when AniList times out", async () => {
  await withCatalog(async ({ source, respond, now }) => {
    respond(aniList);

    const first = await loadCatalog(source, { page: 1 });

    now(1_000_000 + 3_600_001);
    respond(() =>
      Promise.reject(new DOMException("timed out", "TimeoutError"))
    );

    assert.deepEqual(await loadCatalog(source, { page: 1 }), first);
    await assert.rejects(
      loadCatalog(source, { genres: "Drama", page: 1 }),
      AnimeUnavailableError
    );
  });
});
