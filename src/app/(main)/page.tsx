import { type Metadata } from "next";
import dynamic from "next/dynamic";
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

const CharactersMarquee = dynamic(
  () =>
    import("./_components/characters-marquee").then(
      (mod) => mod.CharactersMarquee
    ),
  { ssr: false }
);
const GenresSection = dynamic(
  () => import("./_components/genres-section").then((mod) => mod.GenresSection),
  { ssr: false }
);
const GenresSectionSkeleton = dynamic(
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
};

export default async function Home() {
  const { data: genreData } = await getClient().query(GenresQuery, {});
  const { data: recommended } = await getClient().query(TopAnimeQuery, {});
  const { data: popularData } = await getClient().query(TopAnimeQuery, {
    query: {
      filter: "bypopularity",
      limit: 10,
    },
  });
  const { data: characterData } = await getClient().query(TopCharactersQuery, {
    query: {
      filter: "trending",
      limit: 10,
    },
  });
  const heroAnime = recommended?.getTopAnimes?.[4];
  const shuffledGenres =
    genreData?.getGenres?.sort(() => Math.random() - 0.5).slice(0, 3) ?? [];

  return (
    <>
      <Hero anime={heroAnime} />
      {recommended?.getTopAnimes && (
        <div className="container isolate mx-auto py-20 lg:-mt-64">
          <AnimeCarousel
            heading="Recommended for You"
            animeList={recommended.getTopAnimes}
          />
        </div>
      )}
      {popularData?.getTopAnimes && (
        <div className="container mx-auto py-8">
          <AnimeCarousel
            heading="Popular Anime"
            animeList={popularData.getTopAnimes}
          />
        </div>
      )}
      {genreData?.getGenres && (
        <div className="container mx-auto py-8">
          <Suspense fallback={<GenresSectionSkeleton />}>
            <GenresSection genres={shuffledGenres} />
          </Suspense>
        </div>
      )}
      <Suspense fallback={<TrendingSectionSkeleton />}>
        <TrendingSection />
      </Suspense>
      {characterData?.getTopCharacters && (
        <div className="container mx-auto py-8">
          <CharactersMarquee characters={characterData.getTopCharacters} />
        </div>
      )}
    </>
  );
}
