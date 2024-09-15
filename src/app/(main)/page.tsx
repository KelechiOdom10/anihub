import { type Metadata } from "next";
import { Suspense } from "react";

import { AnimeCarousel } from "./_components/anime-carousel";
import { CharactersMarquee } from "./_components/characters-marquee";
import { GenresSection } from "./_components/genres-section";
import { GenresSectionSkeleton } from "./_components/genres-section-skeleton";

import { getClient } from "~/graphql/client";
import {
  GenresQuery,
  TopAnimeQuery,
  TopCharactersQuery,
} from "~/graphql/queries";

export const metadata: Metadata = {
  title: "Anihub • Social anime discovery",
  description:
    "Anihub is a social platform for discovering and sharing your taste in anime. Use it as a diary to record your opinion about animes as you watch them, or just to keep track of animes you’ve seen in the past. Rate, review and tag animes as you add them. Find and follow your friends to see what they’re enjoying. Keep a watchlist of animes you’d like to see, and create lists/collections on any topic.",
};

export default async function Home() {
  const [
    { data: genreData },
    { data: recommended },
    { data: popularData },
    { data: trendingData },
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
    getClient().query(TopAnimeQuery, {
      query: {
        filter: "favorite",
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

  console.log({
    genreData,
    recommended,
    popularData,
    trendingData,
    characterData,
  });

  const heroAnime = recommended?.getTopAnimes?.[4];
  const shuffledGenres =
    genreData?.getGenres?.sort(() => Math.random() - 0.5).slice(0, 3) ?? [];

  return (
    <>
      {/* <Hero anime={heroAnime} /> */}
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
      {trendingData?.getTopAnimes && (
        <div className="container mx-auto py-8">
          <AnimeCarousel
            heading="Trending Now"
            animeList={trendingData.getTopAnimes}
          />
        </div>
      )}
      {characterData?.getTopCharacters && (
        <div className="container mx-auto py-8">
          <CharactersMarquee characters={characterData.getTopCharacters} />
        </div>
      )}
    </>
  );
}
