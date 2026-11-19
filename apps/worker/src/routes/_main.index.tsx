import { createFileRoute, useRouter } from "@tanstack/react-router";
import {
  AnimeCarousel,
  AnimeCarouselSkeleton,
} from "../components/anime-carousel";
import {
  GenresSection,
  GenresSectionSkeleton,
} from "../components/genres-section";
import { Hero, HeroSkeleton } from "../components/hero";
import { PageMessage } from "../components/page-message";
import { getCategories, getHome } from "../server/functions";

export const Route = createFileRoute("/_main/")({
  loader: async () => {
    const [home, categories] = await Promise.all([getHome(), getCategories()]);

    return { ...home, categories };
  },
  component: Home,
  pendingComponent: HomeSkeleton,
  errorComponent: HomeError,
});

function Home() {
  const { airing, popular, categories } = Route.useLoaderData();
  const hero = airing[4] ?? airing[0];

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
        <AnimeCarousel heading="Top Airing" animeList={airing} />
      </div>
      {categories.length > 0 && (
        <div className="container mx-auto pb-[6.25rem] pt-8">
          <GenresSection categories={categories} />
        </div>
      )}
      {popular.length > 0 && (
        <div className="container mx-auto py-8">
          <AnimeCarousel heading="Popular Anime" animeList={popular} />
        </div>
      )}
    </>
  );
}

function HomeSkeleton() {
  return (
    <div role="status" aria-label="Loading">
      <HeroSkeleton />
      <div className="container isolate mx-auto py-20 lg:-mt-64">
        <AnimeCarouselSkeleton heading="Top Airing" />
      </div>
      <div className="container mx-auto pb-[6.25rem] pt-8">
        <GenresSectionSkeleton />
      </div>
      <div className="container mx-auto py-8">
        <AnimeCarouselSkeleton heading="Popular Anime" />
      </div>
    </div>
  );
}

function HomeError() {
  const router = useRouter();

  return (
    <PageMessage
      heading="Anime data is unavailable"
      body="MyAnimeList didn't respond. Please try again shortly."
      onRetry={() => router.invalidate()}
    />
  );
}
