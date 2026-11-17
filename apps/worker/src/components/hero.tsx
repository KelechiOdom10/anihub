import { Link } from "@tanstack/react-router";
import { englishTitle, plainDescription } from "../lib/anime";
import { useMediaQuery } from "../lib/hooks";
import type { Anime } from "../server/anime";
import { Button } from "./ui/button";

export function Hero({ anime }: { anime: Anime }) {
  const isMobileDevice = useMediaQuery("(max-width: 768px)");

  return (
    <div className="relative z-0 h-[75vh] overflow-hidden bg-black/20 pt-0 md:h-[80vh] md:to-background/60 lg:h-[88vh]">
      <div className="absolute right-0 top-0 h-full max-h-full w-[400px] overflow-hidden md:w-[500px]">
        <div className="absolute inset-0 z-10 bg-gradient-to-r from-background from-5% via-background/60 via-30% to-transparent to-95%" />
        <div className="absolute inset-0 z-10 bg-gradient-to-b from-background/20 via-transparent to-background/30" />
        <div className="absolute inset-0 z-10 bg-black/25" />
        <img
          src={anime.coverImage.extraLarge}
          alt={englishTitle(anime)}
          width={500}
          height={300}
          loading="eager"
          fetchPriority="high"
          className="h-full w-full object-cover object-[center_top]"
        />
      </div>
      <div className="absolute inset-x-0 bottom-0 z-20 flex h-auto items-end pb-12 md:bottom-1/3 lg:items-center lg:pb-0">
        <div className="container text-balance">
          <h1 className="max-w-xl text-3xl font-bold text-white sm:text-4xl md:max-w-3xl md:text-5xl lg:text-7xl">
            {anime.title.romaji}
          </h1>
          <p className="my-4 line-clamp-2 max-w-lg text-base font-semibold text-slate-50 sm:text-lg md:text-xl">
            {plainDescription(anime)}
          </p>
          <div className="flex flex-col gap-4 lg:flex-row">
            <Button asChild size={isMobileDevice ? "default" : "xl"}>
              <Link to="/anime/$id" params={{ id: String(anime.id) }}>
                Learn More
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
