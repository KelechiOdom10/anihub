import { createFileRoute, notFound, useRouter } from "@tanstack/react-router";
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
      body="We couldn't find that anime on AniList."
    />
  ),
  errorComponent: AnimeError,
});

function AnimePage() {
  const anime = Route.useLoaderData();

  return (
    <>
      <AnimeHeader anime={anime} />
      <AnimeToolbar anime={anime} />
      <div className="mx-auto max-w-5xl px-4 py-8 xl:max-w-7xl">
        <div className="px-4 py-6">
          <AnimeOverview anime={anime} />
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
      body="AniList didn't respond. Please try again shortly."
      onRetry={() => router.invalidate()}
    />
  );
}
