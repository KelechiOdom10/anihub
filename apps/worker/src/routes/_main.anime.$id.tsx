import {
  createFileRoute,
  Link,
  notFound,
  useRouter,
} from "@tanstack/react-router";
import { z } from "zod";
import { AnimeReviews } from "../components/anime-reviews";
import {
  AnimeHeader,
  AnimeOverview,
  AnimePageSkeleton,
  AnimeToolbar,
} from "../components/anime-details";
import { PageMessage } from "../components/page-message";
import { englishTitle } from "../lib/anime";
import { animeIdSchema } from "../server/anime";
import { getAnime } from "../server/functions";

export const Route = createFileRoute("/_main/anime/$id")({
  validateSearch: z.object({
    tab: z.enum(["overview", "reviews"]).optional().catch("overview"),
  }),
  loader: async ({ params }) => {
    const id = animeIdSchema.safeParse(params.id);

    if (!id.success) throw notFound();

    const anime = await getAnime({ data: id.data });

    if (!anime) throw notFound();

    return anime;
  },
  head: ({ loaderData }) => ({
    meta: loaderData ? [{ title: `${englishTitle(loaderData)} | Anihub` }] : [],
  }),
  component: AnimePage,
  pendingComponent: AnimePageSkeleton,
  notFoundComponent: () => (
    <PageMessage
      heading="Anime not found"
      body="We couldn't find that anime on MyAnimeList."
    />
  ),
  errorComponent: AnimeError,
});

function AnimePage() {
  const anime = Route.useLoaderData();
  const tab = Route.useSearch().tab ?? "overview";

  return (
    <>
      <AnimeHeader anime={anime} />
      <AnimeToolbar anime={anime} />
      <div className="mx-auto max-w-5xl px-6 pb-16 xl:max-w-7xl">
        <nav
          aria-label="Anime tabs"
          className="mb-8 flex gap-6 border-b border-zinc-800"
        >
          {(["overview", "reviews"] as const).map((value) => (
            <Link
              key={value}
              to="/anime/$id"
              params={{ id: String(anime.id) }}
              search={{ tab: value }}
              resetScroll={false}
              aria-current={tab === value ? "page" : undefined}
              className={`-mb-px border-b-2 px-1 pb-3 text-sm font-medium capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${tab === value ? "border-white text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              {value}
            </Link>
          ))}
        </nav>
        <div>
          {tab === "reviews" ? (
            <AnimeReviews key={anime.id} animeId={anime.id} />
          ) : (
            <AnimeOverview anime={anime} />
          )}
        </div>
      </div>
    </>
  );
}

function AnimeError() {
  const router = useRouter();

  return (
    <PageMessage
      heading="Anime data is unavailable"
      body="MyAnimeList didn't respond. Please try again shortly."
      onRetry={() => router.invalidate()}
    />
  );
}
