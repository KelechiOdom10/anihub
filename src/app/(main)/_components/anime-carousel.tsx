"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "~/components/ui/carousel";
import { type AnimePreview } from "~/graphql/fragments";

const AnimeCard = dynamic(() =>
  import("~/components/ui/anime-card").then((mod) => mod.AnimeCard)
);

interface AnimeCarouselProps {
  heading: string;
  animeList: Array<AnimePreview>;
}

export const AnimeCarousel = ({ heading, animeList }: AnimeCarouselProps) => {
  return (
    <section className="flex flex-col space-y-8">
      <h2 className="text-xl font-bold text-white">{heading}</h2>
      <Carousel
        opts={{
          align: "start",
          dragFree: true,
        }}
        className="w-full"
      >
        <CarouselContent>
          {animeList.map((anime, index) => (
            <CarouselItem key={anime.id} className="basis-auto p-2">
              <Link
                prefetch
                aria-label={`${anime.titles?.[0]?.title}`}
                href={`/anime/${anime.id}`}
              >
                <AnimeCard
                  anime={anime}
                  className="w-56"
                  loading={index < 6 ? "eager" : "lazy"}
                />
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
