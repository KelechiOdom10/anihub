"use client";

import { useQuery } from "@urql/next";

import { AnimeCarousel } from "./anime-carousel";

import { AnimeCardSkeleton } from "~/components/ui/anime-card";
import { TopAnimeQuery } from "~/graphql/queries";

export const TrendingSection = () => {
  const [{ data: trendingData }] = useQuery({
    query: TopAnimeQuery,
    variables: {
      query: {
        filter: "airing",
        limit: 10,
      },
    },
    requestPolicy: "cache-and-network",
  });

  return trendingData?.getTopAnimes ? (
    <div className="container mx-auto py-8">
      <AnimeCarousel
        heading="Trending Now"
        animeList={trendingData.getTopAnimes}
      />
    </div>
  ) : null;
};

export const TrendingSectionSkeleton = () => {
  return (
    <section className="container mx-auto flex flex-col space-y-8 py-8">
      <h2 className="text-xl font-bold text-white">Trending Now</h2>
      <div className="relative w-full">
        <div className="flex gap-4 overflow-hidden">
          {Array(6)
            .fill(0)
            .map((_, index) => (
              <div key={index} className="w-56 shrink-0 p-2">
                <AnimeCardSkeleton />
              </div>
            ))}
        </div>
      </div>
    </section>
  );
};
