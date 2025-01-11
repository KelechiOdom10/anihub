import { type Metadata } from "next";
import dynamicImport from "next/dynamic";
import { Suspense } from "react";

import { AnimeCarousel } from "./_components/anime-carousel";
import { Hero } from "./_components/hero";
import {
  TrendingSection,
  TrendingSectionSkeleton,
} from "./_components/trending-section";

import { getClient } from "~/graphql/client";
import {
  GenresQuery,
  TopAnimeQuery,
  TopCharactersQuery,
} from "~/graphql/queries";

const CharactersMarquee = dynamicImport(
  () =>
    import("./_components/characters-marquee").then(
      (mod) => mod.CharactersMarquee
    ),
  { ssr: false }
);
const GenresSection = dynamicImport(
  () => import("./_components/genres-section").then((mod) => mod.GenresSection),
  { ssr: false }
);
const GenresSectionSkeleton = dynamicImport(
  () =>
    import("./_components/genres-section-skeleton").then(
      (mod) => mod.GenresSectionSkeleton
    ),
  { ssr: false }
);

export const metadata: Metadata = {
  title: "Anihub • Social anime discovery",
  description:
    "Anihub is a social platform for discovering and sharing your taste in anime. Use it as a diary to record your opinion about animes as you watch them, or just to keep track of animes you've seen in the past. Rate, review and tag animes as you add them. Find and follow your friends to see what they're enjoying. Keep a watchlist of animes you'd like to see, and create lists/collections on any topic.",
  keywords: [
    "anime",
    "anime discovery",
    "anime tracking",
    "anime social platform",
    "anime watchlist",
    "anime reviews",
  ],
};

export const dynamic = "auto";

async function getPageData() {
  const [
    { data: genreData },
    { data: recommended },
    { data: popularData },
    { data: characterData },
  ] = await Promise.all([
    getClient().query(GenresQuery, {}),
    getClient().query(TopAnimeQuery, {}),
    getClient().query(TopAnimeQuery, {
      query: {
        filter: "bypopularity",
        limit: 10,
      },
    }),
    getClient().query(TopCharactersQuery, {
      query: {
        filter: "trending",
        limit: 10,
      },
    }),
  ]);

  return {
    genres: genreData?.getGenres ?? [],
    recommended: recommended?.getTopAnimes ?? [],
    popular: popularData?.getTopAnimes ?? [],
    characters: characterData?.getTopCharacters ?? [],
  };
}

export default async function Home() {
  const { genres, recommended, popular, characters } = await getPageData();
  const heroAnime = recommended[4];
  const shuffledGenres = genres.sort(() => Math.random() - 0.5).slice(0, 3);

  return (
    <>
      <Hero anime={heroAnime} />
      {recommended.length > 0 && (
        <div className="container isolate mx-auto py-20 lg:-mt-64">
          <AnimeCarousel
            heading="Recommended for You"
            animeList={recommended}
          />
        </div>
      )}
      {popular.length > 0 && (
        <div className="container mx-auto py-8">
          <AnimeCarousel heading="Popular Anime" animeList={popular} />
        </div>
      )}
      {genres.length > 0 && (
        <div className="container mx-auto py-8">
          <Suspense fallback={<GenresSectionSkeleton />}>
            <GenresSection genres={shuffledGenres} />
          </Suspense>
        </div>
      )}
      <Suspense fallback={<TrendingSectionSkeleton />}>
        <TrendingSection />
      </Suspense>
      {characters.length > 0 && (
        <div className="container mx-auto py-8">
          <CharactersMarquee characters={characters} />
        </div>
      )}
    </>
  );
}
