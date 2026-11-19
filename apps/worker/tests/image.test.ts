import assert from "node:assert/strict";
import { test } from "node:test";
import { coverSources } from "../src/lib/image";

test("a MAL large cover offers the medium size for small slots", () => {
  const url = "https://cdn.myanimelist.net/images/anime/1015/138006l.webp";

  assert.deepEqual(coverSources(url), {
    src: url,
    srcSet:
      "https://cdn.myanimelist.net/images/anime/1015/138006.webp 225w, https://cdn.myanimelist.net/images/anime/1015/138006l.webp 425w",
  });

  assert.equal(
    coverSources("https://cdn.myanimelist.net/images/anime/4/19644l.jpg")
      .srcSet,
    "https://cdn.myanimelist.net/images/anime/4/19644.jpg 225w, https://cdn.myanimelist.net/images/anime/4/19644l.jpg 425w"
  );
});

test("other covers keep a single source", () => {
  for (const url of [
    "/fallback-anime.avif",
    "https://cdn.myanimelist.net/images/anime/4/19644.jpg",
    "https://example.com/images/anime/4/19644l.jpg",
  ])
    assert.deepEqual(coverSources(url), { src: url });
});
