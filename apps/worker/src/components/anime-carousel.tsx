import { Link } from "@tanstack/react-router";
import { englishTitle } from "../lib/anime";
import type { Anime } from "../server/anime";
import { AnimeCard, AnimeCardSkeleton } from "./ui/anime-card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "./ui/carousel";

export function AnimeCarousel({
  heading,
  animeList,
}: {
  heading: string;
  animeList: Anime[];
}) {
  return (
    <section className="flex flex-col space-y-8">
      <h2 className="text-xl font-bold text-white">{heading}</h2>
      <Carousel
        opts={{ align: "start", dragFree: true, loop: true }}
        className="w-full"
      >
        <CarouselContent>
          {animeList.map((anime, index) => (
            <CarouselItem key={anime.id} className="basis-auto p-2">
              <Link
                aria-label={englishTitle(anime)}
                to="/anime/$id"
                params={{ id: String(anime.id) }}
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
}

export function AnimeCarouselSkeleton({ heading }: { heading: string }) {
  return (
    <section className="flex flex-col space-y-8">
      <h2 className="text-xl font-bold text-white">{heading}</h2>
      <div className="relative w-full">
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="w-56 shrink-0 p-2">
              <AnimeCardSkeleton />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
