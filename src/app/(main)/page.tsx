import { type Metadata } from "next";
import { Suspense } from "react";

import { AnimeCarousel } from "./_components/anime-carousel";
import { GenresSection } from "./_components/genres-section";
import { Hero } from "./_components/hero";

import { getClient } from "~/graphql/client";
import { GenresQuery, TopAnimeQuery } from "~/graphql/queries";

export const metadata: Metadata = {
  title: "Next.js Lucia Auth Starter Template",
  description:
    "A Next.js starter template with nextjs and Lucia auth. Includes drizzle, trpc, react-email, tailwindcss and shadcn-ui",
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
  const heroAnime = recommended?.getTopAnimes?.[0];
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
          <Suspense>
            <GenresSection genres={shuffledGenres} />
          </Suspense>
        </div>
      )}
    </>
  );
}
