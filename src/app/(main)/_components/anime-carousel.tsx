"use client";

import { type FragmentOf } from "gql.tada";
import Link from "next/link";

import { AnimeCard } from "~/components/ui/anime-card";
import { type AnimePreview } from "~/graphql/fragments";

interface AnimeCarouselProps {
  heading: string;
  animeList: Array<FragmentOf<typeof AnimePreview>>;
}

export const AnimeCarousel = ({ heading, animeList }: AnimeCarouselProps) => {
  return (
    <section className="flex flex-col space-y-8">
      <h3 className="text-xl font-bold text-white">{heading}</h3>
      <div className="relative flex gap-6 overflow-x-scroll">
        {animeList.map((anime) => (
          <Link key={anime.id} href={`/anime/${anime.id}`}>
            <AnimeCard anime={anime} />
          </Link>
        ))}
      </div>
    </section>
  );
};
