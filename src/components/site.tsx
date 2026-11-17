import { Link } from "@tanstack/react-router";
import { Button } from "./ui/button";
import { animeTitle, type Anime } from "~/data/anime";

export function SiteHeader({ viewer }: { viewer: { name: string; image?: string | null } | null }) {
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link to="/" className="wordmark" aria-label="AniHub home">
          AniHub<span>.</span>
        </Link>
        <nav aria-label="Main navigation">
          <Link to="/" activeProps={{ className: "active" }}>
            Discover
          </Link>
          <a href="/#trending">Trending</a>
        </nav>
        <span className="header-note">A world beyond the ordinary.</span>
        {viewer ? (
          <div className="viewer">
            {viewer.image && <img src={viewer.image} alt="" />}
            <span>{viewer.name}</span>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                const response = await fetch("/api/auth/sign-out", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: "{}",
                });
                if (response.ok) window.location.assign("/");
              }}
            >
              Sign out
            </Button>
          </div>
        ) : (
          <Button asChild size="default">
            <Link to="/sign-in">
              Get started <span aria-hidden="true">↗</span>
            </Link>
          </Button>
        )}
      </div>
    </header>
  );
}
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <Link to="/" className="wordmark">
        AniHub<span>.</span>
      </Link>
      <p>For the stories that stay with you.</p>
      <a href="https://anilist.co" target="_blank" rel="noreferrer">
        Anime data by AniList ↗
      </a>
    </footer>
  );
}
export function Poster({ anime, index }: { anime: Anime; index?: number }) {
  return (
    <Link className="poster" to="/anime/$id" params={{ id: String(anime.id) }}>
      <div className="poster-image">
        <img src={anime.coverImage.extraLarge} alt="" loading="lazy" />
        {anime.averageScore !== null && (
          <span className="poster-score">★ {(anime.averageScore / 10).toFixed(1)}</span>
        )}
        {index !== undefined && (
          <span className="poster-index">{String(index + 1).padStart(2, "0")}</span>
        )}
      </div>
      <h3>{animeTitle(anime)}</h3>
      <p>
        {anime.seasonYear ?? "Upcoming"}
        <span>·</span>
        {anime.genres[0] ?? "Anime"}
      </p>
    </Link>
  );
}
export function PageLoading() {
  return (
    <div className="loading-page" role="status">
      <div className="skeleton skeleton-hero" />
      <div className="loading-posters">
        {Array.from({ length: 6 }, (_, i) => (
          <div className="skeleton" key={i} />
        ))}
      </div>
      <span className="sr-only">Loading anime…</span>
    </div>
  );
}
export function AnimeError({ reset }: { reset: () => void }) {
  return (
    <div className="state-panel">
      <span className="eyebrow">A LITTLE INTERMISSION</span>
      <h1>The anime universe is taking a breather.</h1>
      <p>We couldn't reach AniList. Your next story will be here soon.</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
