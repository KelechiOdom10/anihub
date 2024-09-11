"use client";

import Link from "next/link";

import { AnimeCard } from "~/components/ui/anime-card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "~/components/ui/carousel";
import { type AnimePreview } from "~/graphql/fragments";

interface AnimeCarouselProps {
  heading: string;
  animeList: Array<AnimePreview>;
}

export const AnimeCarousel = ({ heading, animeList }: AnimeCarouselProps) => {
  return (
    <section className="flex flex-col space-y-8">
      <h3 className="text-xl font-bold text-white">{heading}</h3>
      <Carousel
        opts={{
          align: "start",
          dragFree: true,
        }}
        className="w-full"
      >
        <CarouselContent>
          {animeList.map((anime) => (
            <CarouselItem key={anime.id} className="basis-auto p-2">
              <Link href={`/anime/${anime.id}`}>
                <AnimeCard anime={anime} className="w-56" />
              </Link>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="hidden md:block" />
        <CarouselNext className="hidden md:block" />
      </Carousel>
    </section>
  );
};
