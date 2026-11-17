import { createFileRoute, notFound } from "@tanstack/react-router";
import { getAnime } from "~/data/functions";
import { animeTitle, plainDescription } from "~/data/anime";
import { PageLoading, AnimeError } from "~/components/site";
import { Button } from "~/components/ui/button";

export const Route = createFileRoute("/anime/$id")({
  loader: async ({ params }) => {
    if (
      !/^[1-9]\d*$/.test(params.id) ||
      !Number.isSafeInteger(Number(params.id)) ||
      Number(params.id) > 2147483647
    )
      throw notFound();
    const anime = await getAnime({ data: Number(params.id) });
    if (!anime) throw notFound();
    return anime;
  },
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData ? animeTitle(loaderData) + " — AniHub" : "Anime — AniHub" }],
  }),
  component: AnimePage,
  pendingComponent: PageLoading,
  errorComponent: AnimeError,
});
function AnimePage() {
  const anime = Route.useLoaderData();
  return (
    <article>
      <div className="detail-banner">
        <img src={anime.bannerImage ?? anime.coverImage.extraLarge} alt="" />
        <div />
      </div>
      <div className="content-wrap detail-layout">
        <aside className="detail-poster">
          <img src={anime.coverImage.extraLarge} alt={animeTitle(anime) + " poster"} />
          <span className="eyebrow">YOUR NEXT CHAPTER</span>
          <p>Log it. Rate it. Make it yours.</p>
          <Button disabled fullWidth>
            Log / Rate · Coming soon
          </Button>
          <Button disabled fullWidth variant="outline">
            + Add to list · Coming soon
          </Button>
          <small>Your library is on its way.</small>
        </aside>
        <div className="detail-main">
          <span className="eyebrow">DISCOVER / ANIME</span>
          <h1>{animeTitle(anime)}</h1>
          {anime.title.english && anime.title.english !== anime.title.romaji && (
            <p className="romaji">{anime.title.romaji}</p>
          )}
          <div className="detail-meta">
            <span className="score">
              ★ {anime.averageScore ? (anime.averageScore / 10).toFixed(1) : "—"}
              <small>AniList score</small>
            </span>
            <span>{anime.seasonYear ?? "TBA"}</span>
            <span>{anime.format?.replaceAll("_", " ")}</span>
            <span>{anime.episodes ? anime.episodes + " episodes" : "Episodes TBA"}</span>
          </div>
          <div className="genre-tags">
            {anime.genres.map((genre) => (
              <span key={genre}>{genre}</span>
            ))}
          </div>
          <div className="detail-divider" />
          <h2>The story</h2>
          <div className="synopsis">
            {plainDescription(anime.description)
              .split("\n")
              .filter(Boolean)
              .map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
          </div>
          <dl className="anime-facts">
            <div>
              <dt>Status</dt>
              <dd>{anime.status.replaceAll("_", " ").toLowerCase()}</dd>
            </div>
            <div>
              <dt>Studio</dt>
              <dd>
                {anime.studios.nodes.map((studio) => studio.name).join(", ") || "Not announced"}
              </dd>
            </div>
            <div>
              <dt>Original title</dt>
              <dd>{anime.title.romaji}</dd>
            </div>
            <div>
              <dt>Source</dt>
              <dd>
                <a href={"https://anilist.co/anime/" + anime.id} target="_blank" rel="noreferrer">
                  View on AniList ↗
                </a>
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </article>
  );
}
