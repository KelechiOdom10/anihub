import assert from "node:assert/strict";
import { test } from "node:test";
import {
  airedDate,
  englishTitle,
  plainDescription,
  score,
  statusLabel,
} from "../src/lib/anime";
import { homeSchema } from "../src/server/anime";
import fixture from "./fixtures/home.json" with { type: "json" };

const [anime] = homeSchema.parse(fixture).trending;

if (!anime) throw new Error("Fixture needs at least one anime");

test("titles prefer English and fall back to romaji", () => {
  assert.equal(
    englishTitle({ ...anime, title: { english: "English", romaji: "Romaji" } }),
    "English"
  );
  assert.equal(
    englishTitle({ ...anime, title: { english: null, romaji: "Romaji" } }),
    "Romaji"
  );
});

test("descriptions lose AniList markup and entities", () => {
  assert.equal(
    plainDescription({
      ...anime,
      description: "A<br><br>B &amp; <i>C</i> &quot;D&quot; &#39;E&#39;",
    }),
    "A B & C \"D\" 'E'"
  );
  assert.equal(plainDescription({ ...anime, description: null }), "");
});

test("status, score and partial dates use the original Jikan-style wording", () => {
  assert.equal(
    statusLabel({ ...anime, status: "RELEASING" }),
    "Currently Airing"
  );
  assert.equal(
    statusLabel({ ...anime, status: "SOMETHING_NEW" }),
    "SOMETHING_NEW"
  );
  assert.equal(score({ ...anime, averageScore: 87 }), "8.7");
  assert.equal(score({ ...anime, averageScore: null }), null);
  assert.equal(
    airedDate({ year: 1999, month: 10, day: 20 }),
    "20 October 1999"
  );
  assert.equal(airedDate({ year: 2026, month: 4, day: null }), "April 2026");
  assert.equal(airedDate({ year: null, month: null, day: null }), "Unknown");
});
