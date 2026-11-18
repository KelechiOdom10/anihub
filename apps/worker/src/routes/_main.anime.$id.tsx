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
      <div className="mx-auto max-w-5xl px-4 py-8 xl:max-w-7xl">
        <nav aria-label="Anime tabs" className="relative mb-6">
          <div className="flex h-9 max-w-xl items-center justify-start rounded-lg bg-muted p-1 text-muted-foreground">
            {(["overview", "reviews"] as const).map((value) => (
              <Link
                key={value}
                to="/anime/$id"
                params={{ id: String(anime.id) }}
                search={{ tab: value }}
                resetScroll={false}
                aria-current={tab === value ? "page" : undefined}
                className={`inline-flex flex-1 items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium capitalize ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${tab === value ? "bg-background text-foreground shadow" : ""}`}
              >
                {value}
              </Link>
            ))}
          </div>
        </nav>
        <div className="px-4 py-6">
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
