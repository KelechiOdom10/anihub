import { createFileRoute, Link } from "@tanstack/react-router";
import { getHome } from "~/data/functions";
import { animeTitle, plainDescription } from "~/data/anime";
import { Poster, PageLoading, AnimeError } from "~/components/site";
import { Button } from "~/components/ui/button";

export const Route = createFileRoute("/")({
  loader: () => getHome(),
  component: Home,
  pendingComponent: PageLoading,
  errorComponent: AnimeError,
});
function Home() {
  const { featured, trending, popular } = Route.useLoaderData();
  const hero = featured ?? trending[0];
  if (!hero)
    return (
      <div className="state-panel">
        <h1>More stories are on their way.</h1>
        <p>Check back soon for new anime.</p>
      </div>
    );
  return (
    <>
      <section className="hero">
        <img
          className="hero-art"
          src={hero.bannerImage ?? hero.coverImage.extraLarge}
          alt=""
          fetchPriority="high"
        />
        <div className="hero-shade" />
        <div className="hero-copy">
          <span className="eyebrow">
            <span className="live-dot" /> IN THE SPOTLIGHT
          </span>
          <div className="hero-meta">
            <span>{hero.seasonYear}</span>
            <span>{hero.format?.replaceAll("_", " ")}</span>
            <span>{hero.genres.slice(0, 2).join(" / ")}</span>
          </div>
          <h1>{animeTitle(hero)}</h1>
          <p>{plainDescription(hero.description).split("\n")[0]}</p>
          <div className="hero-actions">
            <Button asChild>
              <Link to="/anime/$id" params={{ id: String(hero.id) }}>
                Explore the story <span aria-hidden="true">↗</span>
              </Link>
            </Button>
            <span className="hero-rating">
              ★ {hero.averageScore ? (hero.averageScore / 10).toFixed(1) : "—"}{" "}
              <small>AniList score</small>
            </span>
          </div>
        </div>
        <div className="hero-caption">
          <span>YOUR NEXT OBSESSION STARTS HERE</span>
          <span>01 / DISCOVER</span>
        </div>
      </section>
      <div className="content-wrap">
        <section className="anime-section" id="trending">
          <div className="section-heading">
            <div>
              <span className="eyebrow">THE CONVERSATION STARTS HERE</span>
              <h2>
                Trending now<span>.</span>
              </h2>
            </div>
            <span className="section-note">What everyone's getting lost in</span>
          </div>
          <div className="poster-grid">
            {trending.map((anime, index) => (
              <Poster key={anime.id} anime={anime} index={index} />
            ))}
          </div>
        </section>
        <section className="editorial">
          <div>
            <span className="eyebrow">MORE THAN A WATCHLIST</span>
            <h2>
              Some stories
              <br />
              stay with you.
            </h2>
            <p>Find your next favourite. Make AniHub your own.</p>
            <Button asChild>
              <Link to="/sign-in">
                Find your people <span aria-hidden="true">↗</span>
              </Link>
            </Button>
          </div>
          <div className="editorial-posters" aria-hidden="true">
            {popular.slice(0, 3).map((anime) => (
              <img key={anime.id} src={anime.coverImage.extraLarge} alt="" loading="lazy" />
            ))}
          </div>
        </section>
        <section className="anime-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">THE ONES WORTH YOUR TIME</span>
              <h2>
                All-time favourites<span>.</span>
              </h2>
            </div>
            <span className="section-note">Big worlds. Bigger feelings.</span>
          </div>
          <div className="poster-grid">
            {popular.map((anime) => (
              <Poster key={anime.id} anime={anime} />
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
