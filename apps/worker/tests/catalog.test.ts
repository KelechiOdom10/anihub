import assert from "node:assert/strict";
import { test } from "node:test";
import { animeCache, cacheEntries } from "../src/db/schema";
import { catalogSearchSchema } from "../src/lib/catalog";
import { animeIdSchema, seasons, type Anime } from "../src/server/anime";
import {
  AnimeUnavailableError,
  loadAnime,
  loadCatalog,
  loadCategories,
  loadHome,
  type CatalogSource,
} from "../src/server/catalog";
import { chooseCovers, genres, pickCategories } from "../src/server/genres";
import { createTestDatabase } from "./d1";

const mal = {
  id: 21,
  title: "Fixture Show",
  main_picture: {
    medium: "https://example.com/fixture-show.jpg",
    large: "https://example.com/fixture-show-large.jpg",
  },
  alternative_titles: { en: "Fixture Show" },
  synopsis: "Synthetic synopsis",
  mean: 7.5,
  num_episodes: 0,
  start_season: { year: 2001, season: "winter" },
  start_date: "2001-02-03",
  media_type: "tv",
  status: "currently_airing",
  genres: [{ id: 2, name: "Adventure" }],
  studios: [{ id: 18, name: "Fixture Studio" }],
  rating: "pg_13",
};

const anime: Anime = {
  id: 21,
  title: { romaji: "Fixture Show", english: "Fixture Show" },
  description: "Synthetic synopsis",
  coverImage: { extraLarge: "https://example.com/fixture-show-large.jpg" },
  averageScore: 7.5,
  episodes: null,
  seasonYear: 2001,
  startDate: { year: 2001, month: 2, day: 3 },
  endDate: { year: null, month: null, day: null },
  format: "TV",
  status: "currently_airing",
  genres: ["Adventure"],
  studios: { nodes: [{ name: "Fixture Studio" }] },
};

type Upstream = (url: URL, init?: RequestInit) => Response | Promise<Response>;

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
    fetch: async (input, init) => {
      calls += 1;

      return upstream(new URL(String(input)), init);
    },
    now: () => clock,
    clientId: "test-client",
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

test("anime is fetched once, cached in D1, then served fresh without calling MyAnimeList", async () => {
  await withCatalog(async ({ source, calls, respond }) => {
    respond(() => Response.json(mal));

    assert.deepEqual(await loadAnime(source, 21), anime);
    assert.deepEqual(await loadAnime(source, 21), anime);
    assert.equal(calls(), 1);
  });
});

test("only the public anime contract is cached, never extra upstream fields", async () => {
  await withCatalog(async ({ source, respond }) => {
    respond(() =>
      Promise.resolve(
        Response.json({ ...mal, my_list_status: { status: "watching" } })
      )
    );
    await loadAnime(source, 21);

    const [row] = await source.db.select().from(cacheEntries);

    assert.deepEqual(row?.data, anime);
  });
});

test("stale anime is served when MyAnimeList times out, and refreshed once it recovers", async () => {
  await withCatalog(async ({ source, respond, now }) => {
    respond(() => Response.json(mal));
    await loadAnime(source, 21);
    now(1_000_000 + 86_400_001);
    respond(() =>
      Promise.reject(new DOMException("timed out", "TimeoutError"))
    );

    assert.deepEqual(await loadAnime(source, 21), anime);

    respond(() =>
      Response.json({ ...mal, alternative_titles: { en: "Renamed" } })
    );

    assert.deepEqual(await loadAnime(source, 21), {
      ...anime,
      title: { ...anime.title, english: "Renamed" },
    });
  });
});

test("upstream failures without a cached copy surface as unavailable", async () => {
  await withCatalog(async ({ source, respond }) => {
    respond(() => Promise.resolve(new Response("busy", { status: 503 })));
    await assert.rejects(loadAnime(source, 21), AnimeUnavailableError);

    respond(() => Promise.resolve(Response.json({ id: "broken" })));
    await assert.rejects(loadAnime(source, 21), AnimeUnavailableError);

    respond(() => Promise.resolve(new Response("<html>", { status: 200 })));
    await assert.rejects(loadHome(source), AnimeUnavailableError);
  });
});

test("missing anime resolves to null and caches nothing", async () => {
  await withCatalog(async ({ source, respond }) => {
    respond(() =>
      Promise.resolve(Response.json({ error: "not_found" }, { status: 404 }))
    );

    assert.equal(await loadAnime(source, 999999), null);
    assert.equal((await source.db.select().from(cacheEntries)).length, 0);
  });
});

test("home lists are cached for an hour and served stale during an outage", async () => {
  await withCatalog(async ({ source, calls, respond, now }) => {
    respond((url) =>
      Response.json({
        data:
          url.searchParams.get("ranking_type") === "airing"
            ? [{ node: mal, ranking: { rank: 1 } }]
            : [],
        paging: {},
      })
    );

    assert.deepEqual(await loadHome(source), {
      airing: [anime],
      popular: [],
    });
    await loadHome(source);
    assert.equal(calls(), 2);

    now(1_000_000 + 3_600_001);
    respond(() => Promise.reject(new TypeError("network down")));

    assert.deepEqual(await loadHome(source), {
      airing: [anime],
      popular: [],
    });
    assert.equal(calls(), 4);
  });
});

test("anime ids accept positive 32-bit integers only", () => {
  assert.equal(animeIdSchema.parse("21"), 21);

  for (const value of ["0", "-1", "1.5", "abc", "2147483648", ""])
    assert.equal(animeIdSchema.safeParse(value).success, false, value);
});

function ranking(url: URL) {
  const limit = Number(url.searchParams.get("limit"));
  const offset = Number(url.searchParams.get("offset") ?? 0);

  return Response.json({
    data: Array.from({ length: limit }, (_, index) => {
      const id = offset + index + 1;
      const genre = genres[id % genres.length] ?? "Action";

      return {
        node: {
          ...mal,
          id,
          title: `${genre} ${id}`,
          alternative_titles: {},
          genres: [{ id: 0, name: genre }],
        },
        ranking: { rank: id },
      };
    }),
    paging: { next: "https://api.myanimelist.net/v2/next" },
  });
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
    respond(ranking);

    const categories = await loadCategories(source);

    assert.equal(categories.length, 3);
    assert.equal(calls(), 1);

    for (const { genre, anime: covers } of categories) {
      assert.equal(covers.length, 3);
      assert.ok(covers.every((entry) => entry.genres.includes(genre)));
    }

    const ids = categories.flatMap((category) =>
      category.anime.map((entry) => entry.id)
    );

    assert.equal(new Set(ids).size, ids.length);
    assert.deepEqual(await loadCategories(source), categories);
    assert.equal(calls(), 1);
  });
});

test("categories disappear instead of breaking home when MyAnimeList is down with no cache", async () => {
  await withCatalog(async ({ source, respond }) => {
    respond(() => Promise.resolve(new Response("busy", { status: 503 })));

    assert.deepEqual(await loadCategories(source), []);
  });
});

test("genre pages filter one cached popularity ranking, paged locally", async () => {
  await withCatalog(async ({ source, calls, respond }) => {
    const requested: string[] = [];

    respond((url) => {
      requested.push(url.search);

      return ranking(url);
    });

    const romance = await loadCatalog(source, { genres: "Romance", page: 1 });

    assert.ok(
      romance.kind === "results" &&
        romance.anime.length > 0 &&
        romance.anime.every((entry) => entry.genres.includes("Romance"))
    );

    const drama = await loadCatalog(source, { genres: "Drama", page: 1 });

    assert.ok(
      drama.kind === "results" &&
        drama.anime.every((entry) => entry.genres.includes("Drama"))
    );
    assert.equal(calls(), 1);
    assert.match(requested[0] ?? "", /ranking_type=bypopularity&limit=500/);

    const all = await loadCatalog(source, { page: 2 });

    assert.ok(
      all.kind === "results" &&
        all.genre === null &&
        all.hasNextPage &&
        all.anime[0]?.id === 26
    );
    assert.match(requested[1] ?? "", /limit=25&offset=25/);
  });
});

test("adult titles and unknown ids resolve to not found", async () => {
  await withCatalog(async ({ source, respond }) => {
    respond(() => Response.json({ ...mal, rating: "rx" }));

    assert.equal(await loadAnime(source, 21), null);
    assert.equal((await source.db.select().from(cacheEntries)).length, 0);
  });
});

test("requests carry the client id header", async () => {
  await withCatalog(async ({ source, respond }) => {
    let header: string | null = null;

    respond((_url, init) => {
      header = new Headers(init?.headers).get("X-MAL-CLIENT-ID");

      return Response.json(mal);
    });
    await loadAnime(source, 21);

    assert.equal(header, "test-client");
  });
});

test("legacy MAL genre ids redirect to their genre name without calling MyAnimeList", async () => {
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
  await withCatalog(async ({ source, calls, respond }) => {
    respond(ranking);

    for (const value of ["41", "62", "12", "1,4", "Isekai", "Hentai", "action"])
      assert.deepEqual(await loadCatalog(source, { genres: value, page: 1 }), {
        kind: "unsupported",
        value,
      });
    assert.equal(calls(), 0);
  });
});

test("a stale catalog page is served when MyAnimeList times out", async () => {
  await withCatalog(async ({ source, respond, now }) => {
    respond(ranking);

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

test("documented MyAnimeList nulls and partial dates map to the existing fallbacks", async () => {
  await withCatalog(async ({ source, respond }) => {
    respond(() =>
      Response.json({
        ...mal,
        main_picture: null,
        alternative_titles: { en: null },
        synopsis: null,
        mean: null,
        start_season: null,
        start_date: "2023-09",
        end_date: null,
        media_type: null,
        genres: null,
        studios: null,
        rating: null,
      })
    );

    assert.deepEqual(await loadAnime(source, 21), {
      ...anime,
      title: { romaji: "Fixture Show", english: null },
      description: null,
      coverImage: { extraLarge: "/fallback-anime.avif" },
      averageScore: null,
      seasonYear: 2023,
      startDate: { year: 2023, month: 9, day: null },
      format: null,
      genres: [],
      studios: { nodes: [] },
    });
  });
});

test("a removed or adult title drops its cached copy instead of resurrecting it later", async () => {
  for (const removal of [
    () => Response.json({ error: "not_found" }, { status: 404 }),
    () => Response.json({ ...mal, rating: "rx" }),
  ])
    await withCatalog(async ({ source, respond, now }) => {
      respond(() => Response.json(mal));
      await loadAnime(source, 21);
      now(1_000_000 + 86_400_001);
      respond(removal);

      assert.equal(await loadAnime(source, 21), null);

      respond(() => Promise.reject(new TypeError("network down")));

      await assert.rejects(loadAnime(source, 21), AnimeUnavailableError);
    });
});

test("a malformed success body is an outage, served from the stale copy", async () => {
  await withCatalog(async ({ source, respond, now }) => {
    respond(() => Response.json(mal));
    await loadAnime(source, 21);
    now(1_000_000 + 86_400_001);

    for (const body of ["null", "<html>"]) {
      respond(() => new Response(body, { status: 200 }));

      assert.deepEqual(await loadAnime(source, 21), anime);
    }
  });
});

test("adult titles are filtered out of ranking lists", async () => {
  await withCatalog(async ({ source, respond }) => {
    respond((url) => {
      assert.match(url.searchParams.get("fields") ?? "", /rating/);

      return Response.json({
        data: [
          { node: { ...mal, id: 1, rating: "rx" } },
          { node: { ...mal, id: 2 } },
        ],
        paging: {},
      });
    });

    const page = await loadCatalog(source, { page: 1 });

    assert.ok(page.kind === "results");
    assert.deepEqual(
      page.anime.map((entry) => entry.id),
      [2]
    );
    assert.equal(page.hasNextPage, false);
  });
});

test("requests never follow redirects, so the client id stays on MyAnimeList", async () => {
  await withCatalog(async ({ source, respond }) => {
    let redirect: RequestRedirect | undefined;

    respond((_url, init) => {
      redirect = init?.redirect;

      return new Response(null, {
        status: 302,
        headers: { Location: "https://example.com/" },
      });
    });

    await assert.rejects(loadAnime(source, 21), AnimeUnavailableError);
    assert.equal(redirect, "manual");
  });
});

test("Show More stops at the last page the catalog accepts", async () => {
  await withCatalog(async ({ source, respond }) => {
    respond(ranking);

    const last = await loadCatalog(source, { page: 200 });

    assert.ok(last.kind === "results" && !last.hasNextPage);

    const action = await loadCatalog(source, { genres: "Action", page: 1 });
    const lastAction = await loadCatalog(source, { genres: "Action", page: 2 });

    assert.ok(action.kind === "results" && action.hasNextPage);
    assert.ok(
      lastAction.kind === "results" &&
        lastAction.anime.length > 0 &&
        !lastAction.hasNextPage
    );
  });
});

test("AniList rows left in the old cache tables are never served for MyAnimeList ids", async () => {
  await withCatalog(async ({ source, calls, respond }) => {
    const aniList = { ...anime, title: { romaji: "AniList", english: null } };

    await source.db.insert(animeCache).values({
      id: 21,
      malId: 999,
      data: aniList,
      updatedAt: new Date(1_000_000),
    });
    await source.db.insert(cacheEntries).values([
      {
        key: "home",
        data: { airing: [aniList], popular: [] },
        updatedAt: new Date(1_000_000),
      },
      {
        key: "catalog:all:1",
        data: { anime: [aniList], hasNextPage: false },
        updatedAt: new Date(1_000_000),
      },
    ]);
    respond((url) =>
      url.pathname.endsWith("/ranking") ? ranking(url) : Response.json(mal)
    );

    assert.deepEqual(await loadAnime(source, 21), anime);

    const home = await loadHome(source);
    const page = await loadCatalog(source, { page: 1 });

    assert.ok(home.airing.every((entry) => entry.title.romaji !== "AniList"));
    assert.ok(
      page.kind === "results" &&
        page.anime.every((entry) => entry.title.romaji !== "AniList")
    );
    assert.equal(calls(), 4);
  });
});

function listOf(
  nodes: Array<
    Omit<Partial<typeof mal>, "mean"> & {
      popularity?: number;
      mean?: number | null;
    }
  >,
  next = false
) {
  return Response.json({
    data: nodes.map((node) => ({
      node: { ...mal, alternative_titles: {}, ...node },
    })),
    paging: next ? { next: "https://api.myanimelist.net/v2/next" } : {},
  });
}

test("title search filters and sorts MyAnimeList's matches, reusing one cached search", async () => {
  await withCatalog(async ({ source, calls, respond }) => {
    const requested: URL[] = [];

    respond((url) => {
      requested.push(url);

      return listOf([
        { id: 1, title: "Alpha", media_type: "tv", mean: 7, popularity: 30 },
        { id: 2, title: "Beta", media_type: "movie", mean: 9, popularity: 10 },
        { id: 3, title: "Gamma", media_type: "tv", mean: 8, popularity: 20 },
        {
          id: 4,
          title: "Delta",
          media_type: "tv",
          status: "finished_airing",
          mean: null,
          popularity: 5,
        },
      ]);
    });

    const ids = async (query: Parameters<typeof loadCatalog>[1]) => {
      const result = await loadCatalog(source, query);

      assert.equal(result.kind, "results");

      return result.kind === "results" ? result.anime.map((a) => a.id) : [];
    };

    assert.deepEqual(await ids({ q: "  Fixture ", page: 1 }), [1, 2, 3, 4]);
    assert.equal(requested[0]?.pathname, "/v2/anime");
    assert.equal(requested[0]?.searchParams.get("q"), "fixture");
    assert.equal(requested[0]?.searchParams.get("limit"), "100");

    assert.deepEqual(
      await ids({ q: "fixture", type: "tv", order_by: "score", page: 1 }),
      [3, 1, 4]
    );
    assert.deepEqual(
      await ids({ q: "fixture", type: "tv", status: "airing", page: 1 }),
      [1, 3]
    );
    assert.deepEqual(
      await ids({ q: "fixture", order_by: "popularity", sort: "asc", page: 1 }),
      [1, 3, 2, 4]
    );
    assert.deepEqual(
      await ids({ q: "fixture", order_by: "title", page: 1 }),
      [1, 2, 4, 3]
    );
    assert.equal(calls(), 1);
  });
});

test("search shorter than three characters is refused before calling MyAnimeList", async () => {
  await withCatalog(async ({ source, calls }) => {
    await assert.rejects(loadCatalog(source, { q: "ab", page: 1 }));
    assert.equal(calls(), 0);
  });
});

test("a year loads its seasons, and a season loads only that season", async () => {
  await withCatalog(async ({ source, respond }) => {
    const paths: string[] = [];

    respond((url) => {
      paths.push(url.pathname);

      const season = url.pathname.split("/").pop();

      return listOf([
        {
          id: seasons.findIndex((value) => value === season) + 1,
          title: season,
        },
        { id: 99, title: "Shared", status: "finished_airing" },
      ]);
    });

    const spring = await loadCatalog(source, {
      year: 2020,
      season: ["spring"],
      page: 1,
    });

    assert.deepEqual(paths, ["/v2/anime/season/2020/spring"]);
    assert.ok(spring.kind === "results" && spring.anime.length === 2);

    const year = await loadCatalog(source, {
      year: 2020,
      status: "complete",
      page: 1,
    });

    assert.deepEqual(paths.slice(1).sort(), [
      "/v2/anime/season/2020/fall",
      "/v2/anime/season/2020/summer",
      "/v2/anime/season/2020/winter",
    ]);
    assert.ok(
      year.kind === "results" &&
        year.anime.length === 1 &&
        year.anime[0]?.id === 99 &&
        year.subset === null
    );
  });
});

test("airing status browses MyAnimeList's airing ranking and notes when it is cut at 500", async () => {
  await withCatalog(async ({ source, respond }) => {
    const types: Array<string | null> = [];

    respond((url) => {
      types.push(url.searchParams.get("ranking_type"));

      return listOf([{ id: 1 }, { id: 2, media_type: "movie" }], true);
    });

    const airing = await loadCatalog(source, {
      status: "airing",
      type: "movie",
      page: 1,
    });

    assert.deepEqual(types, ["airing"]);
    assert.ok(
      airing.kind === "results" &&
        airing.anime.map((entry) => entry.id).join() === "2" &&
        airing.subset === "Among MyAnimeList's 500 top-ranked airing anime."
    );
  });
});

test("the catalog URL keeps valid filters and drops unusable ones", () => {
  assert.deepEqual(
    catalogSearchSchema.parse({
      q: "ab",
      year: "2020",
      season: "fall,bogus,spring",
      type: "tv",
      status: "finished",
      genres: 22,
      order_by: "score",
      sort: "sideways",
    }),
    {
      q: undefined,
      year: 2020,
      season: "spring,fall",
      type: "tv",
      status: undefined,
      genres: "22",
      order_by: "score",
      sort: undefined,
    }
  );
});

test("a season without a year filters by start month and keeps the source note", async () => {
  await withCatalog(async ({ source, respond }) => {
    const requested: URL[] = [];

    respond((url) => {
      requested.push(url);

      return listOf(
        [
          { id: 1, start_date: "2020-01-10" },
          { id: 2, start_date: "2021-04-02" },
          { id: 3, start_date: "2019-02-20" },
        ],
        true
      );
    });

    const winter = await loadCatalog(source, { season: ["winter"], page: 1 });

    assert.match(requested[0]?.search ?? "", /ranking_type=bypopularity/);
    assert.ok(
      winter.kind === "results" &&
        winter.anime.map((entry) => entry.id).join() === "1,3" &&
        winter.subset === "Among MyAnimeList's 500 most popular anime."
    );
  });
});
