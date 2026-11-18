# Original UI on the Worker

The Worker renders AniHub's original design system, ported from the root Next.js app rather than redesigned.

## What is carried over unchanged

- Tailwind 3.4.14 with the original theme: the container (centred, 2rem padding, 1400px at `2xl`), `--font-sans`, semantic colour tokens and `--radius: 0.5rem`. The app is dark-only, as the original was via `forcedTheme="dark"`, so only the original `.dark` token values ship.
- Inter as one variable latin woff2 from `@fontsource-variable/inter@5.3.0`, the same file the root app loads, preloaded and set with `font-display: swap`.
- The SVG logo, `Button` and `Card`, copied verbatim apart from import paths.
- The fixed header that is transparent at the top and turns opaque with a bottom border once scrolled.
- The viewport-height hero with its right-hand portrait and gradients, the first carousel overlapping it on large screens, 224px rounded-xl poster cards with title, year and genre overlaid, and the Embla carousel with its arrow controls.
- The anime page banner, poster, title, score, Details grid and Description.
- The standalone centred `max-w-md` auth card without the site header or footer.
- The home Categories section: three "The best _Genre_ Animes" cards with meteors and three tilted covers, linking to that genre's catalog results. See [Categories](#categories).
- The footer, and the black "A" favicon from `src/app/icon.tsx` as a static SVG.

## What is deliberately left out

These controls in the original either belong to features outside this milestone or no longer work, so they are left out rather than shipped as buttons that do nothing:

- Header navigation to Catalog, News and Collections, the search field, and the mobile menu that only held those links.
- "Save to Watchlist", "Watching", "To Watch", "Watched", "Add to Collection" and "Watch Trailer". Cached MyAnimeList data has no trailer.
- The anime page tabs (Relations, Characters, Reviews) and the home characters section.
- The catalog's filter sidebar, sort dropdown, mobile filter sheet and search. `/catalog` keeps only its results area (see below).
- Email/password fields, sign-up and password reset. Login and Register become one "Sign in" button, and the card offers Google and Discord.

## Data and states

The home page shows MyAnimeList's top airing ranking (as "Top Airing", overlapping the hero) and its popularity ranking from the D1 cache. The hero is the fifth trending entry, matching the original's choice of the fifth item in its first list, and shows the romaji title as the original did. Statuses use the original Jikan wording ("Currently Airing").

Old `/anime/<id>` links used MyAnimeList ids, and so does the Worker, so they keep working. Imported comments and collection items keep their `mal_id`.

Each route has loading, empty, not-found (404) and MyAnimeList-unavailable states with a retry.

## Categories

The original home page shuffled every Jikan genre on each request and showed three. Each card linked to `/catalog?genres=<MAL id>`, the full catalog page. Its covers did not come from the card's genre: the section fetched nine titles from one random genre out of Action, Adventure and Comedy and split them across the three cards.

The Worker keeps the cards' markup and styling and fixes the data:

- The three genres come from the 17 legacy MyAnimeList genres below, picked deterministically per UTC day and cached in D1, so they don't change between renders or during hydration. The meteor positions are deterministic for the same reason.
- Each card shows three covers from its own genre's most popular titles, skipping titles already shown on an earlier card.
- Cards link to `/catalog?genres=<genre name>`. The page renders the original catalog results area: the "Catalog" heading, the removable genre tag, the five-column `AnimeCard` grid, the "No results found" empty state and "Show More" pagination. Removing the tag lists all anime by popularity.
- Old numeric links keep working for the genres AniHub lists: 1 Action, 2 Adventure, 4 Comedy, 7 Mystery, 8 Drama, 9 Ecchi, 10 Fantasy, 14 Horror, 18 Mecha, 19 Music, 22 Romance, 24 Sci-Fi, 30 Sports, 36 Slice of Life, 37 Supernatural, 40 Psychological and 66 Mahou Shoujo redirect (301) to the genre name. Every other value, including other MyAnimeList genres such as 41 Suspense, theme ids such as 62 Isekai, and multi-genre values such as `1,4`, shows "Genre not available" instead of unrelated results.
- MyAnimeList's API has no genre filter, so genre results filter its 500 most popular titles, fetched once a day and cached in D1; niche genres therefore list fewer titles, and the results page says the list isn't the full genre. All-anime pages are cached for an hour, with the same stale-copy fallback as the home lists. If MyAnimeList is down and nothing is cached, the Categories section is hidden and the catalog shows the unavailable state with a retry.

## Comparison method

The public Jikan REST v4 API (`api.jikan.moe/v4`), the original data source, timed out from this machine when these captures were made, so the original would have rendered blank. This is not a claim that Jikan is permanently shut down: the maintained Jikan PHP library is now v5 and ships no hosted instance, the jikan-rest README still describes the public v4 API, and there is no verified public `/v5` replacement. One AniList response was recorded and served to both apps: to the original through a local Jikan-shaped stand-in (with its API base URL pointed at it for the run only, never committed), and to the Worker through its seeded local D1 cache. Both were captured with the same Chrome at 1440×900 and 390×844.

Artifacts in Capy Drive under `renders/ANIH-3/ui-comparison/`: `compare-{home,anime,sign-in}-{desktop,mobile}.png` side by side, plus the individual `original-*` and `restored-*` captures. Categories and catalog captures are under `renders/ANIH-3/categories/`, `compare-{categories,catalog}-{desktop,mobile}.png`, using recorded AniList genre pages for Action, Romance and Sci-Fi. The original's covers there show its genre mismatch.

## Tests

`pnpm --filter @anihub/worker test:browser` seeds local D1 from `tests/fixtures/home.json` and drives the built Worker in Chromium. The fixtures are synthetic ("Fixture Anime <id>", the local placeholder cover, synthetic synopses and studios), so no third-party metadata or image URLs are committed. It checks the hero, carousels, Inter loading, header transparency before and after scrolling, keyboard focus and navigation, the anime details, 404 states, the sign-in card offering only Google and Discord, its error message, and that nothing overflows horizontally at 390px. It also seeds `tests/fixtures/catalog.json` and checks the Categories cards and their covers, opening a genre, "Show More", removing the tag, the legacy-id redirect and unsupported genre values.
