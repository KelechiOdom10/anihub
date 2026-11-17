import { createFileRoute, useRouter } from "@tanstack/react-router";
import {
  AnimeCarousel,
  AnimeCarouselSkeleton,
} from "../components/anime-carousel";
import { Hero } from "../components/hero";
import { PageMessage } from "../components/page-message";
import { getHome } from "../server/functions";

export const Route = createFileRoute("/_main/")({
  loader: () => getHome(),
  component: Home,
  pendingComponent: () => (
    <div className="container mx-auto py-28">
      <AnimeCarouselSkeleton heading="Trending Now" />
    </div>
  ),
  errorComponent: HomeError,
});

function Home() {
  const { trending, popular } = Route.useLoaderData();
  const hero = trending[4] ?? trending[0];

  if (!hero)
    return (
      <PageMessage
        heading="Nothing to show yet"
        body="No anime are available right now. Check back soon."
      />
    );

  return (
    <>
      <Hero anime={hero} />
      <div className="container isolate mx-auto py-20 lg:-mt-64">
        <AnimeCarousel heading="Trending Now" animeList={trending} />
      </div>
      {popular.length > 0 && (
        <div className="container mx-auto py-8">
          <AnimeCarousel heading="Popular Anime" animeList={popular} />
        </div>
      )}
    </>
  );
}

function HomeError() {
  const router = useRouter();

  return (
    <PageMessage
      heading="Anime data is unavailable"
      body="AniList didn't respond. Please try again shortly."
      onRetry={() => router.invalidate()}
    />
  );
}
