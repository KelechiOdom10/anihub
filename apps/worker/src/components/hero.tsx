import { Link } from "@tanstack/react-router";
import { englishTitle, plainDescription } from "../lib/anime";
import { coverHeight, coverWidth } from "../lib/image";
import { useMediaQuery } from "../lib/hooks";
import type { Anime } from "../server/anime";
import { Button } from "./ui/button";

export function HeroBackdrop({ anime }: { anime: Anime }) {
  return (
    <>
      <div className="absolute right-0 top-0 h-full max-h-full w-full overflow-hidden [mask-composite:intersect] [mask-image:linear-gradient(to_right,#0000,#0004_8%,#000b_18%,#000_28%),linear-gradient(to_bottom,#000_55%,#0006_80%,#0000)] md:w-[62%]">
        <img
          src={anime.coverImage.extraLarge}
          alt={englishTitle(anime)}
          width={coverWidth}
          height={coverHeight}
          loading="eager"
          fetchPriority="high"
          className="h-full w-full object-cover object-[center_top]"
        />
      </div>
      <div className="absolute inset-0 z-10 bg-gradient-to-t from-background/90 via-background/40 to-transparent md:bg-gradient-to-r md:from-background/80 md:via-background/30 md:via-35% md:to-transparent md:to-60%" />
    </>
  );
}

export function Hero({ anime }: { anime: Anime }) {
  const isMobileDevice = useMediaQuery("(max-width: 768px)");

  return (
    <div className="relative z-0 h-[75vh] overflow-hidden pt-0 md:h-[80vh] lg:h-[88vh]">
      <HeroBackdrop anime={anime} />
      <div className="absolute inset-x-0 bottom-0 z-20 flex h-auto items-end pb-12 md:bottom-1/3 lg:items-center lg:pb-0">
        <div className="container text-balance">
          <h1 className="max-w-xl text-3xl font-bold text-white sm:text-4xl md:max-w-3xl md:text-5xl lg:text-7xl">
            {anime.title.romaji}
          </h1>
          <p className="my-4 line-clamp-2 max-w-lg text-base font-semibold text-slate-50 sm:text-lg md:text-xl">
            {plainDescription(anime)}
          </p>
          <div className="flex flex-col gap-4 lg:flex-row">
            <Button asChild size={isMobileDevice ? "default" : "lg"}>
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

export function HeroSkeleton() {
  return (
    <div className="relative z-0 h-[75vh] overflow-hidden pt-0 md:h-[80vh] lg:h-[88vh]">
      <div className="absolute right-0 top-0 h-full w-full animate-pulse bg-zinc-800 [mask-composite:intersect] [mask-image:linear-gradient(to_right,#0000,#0004_8%,#000b_18%,#000_28%),linear-gradient(to_bottom,#000_55%,#0006_80%,#0000)] md:w-[62%]" />
      <div className="absolute inset-x-0 bottom-0 z-20 flex h-auto items-end pb-12 md:bottom-1/3 lg:items-center lg:pb-0">
        <div className="container">
          <div className="h-9 w-2/3 max-w-xl animate-pulse rounded-lg bg-zinc-800 md:h-12 lg:h-16" />
          <div className="my-4 max-w-lg space-y-2">
            <div className="h-5 w-full animate-pulse rounded-md bg-zinc-800" />
            <div className="h-5 w-4/5 animate-pulse rounded-md bg-zinc-800" />
          </div>
          <div className="h-9 w-full animate-pulse rounded-md bg-zinc-800 md:h-10 lg:w-32" />
        </div>
      </div>
    </div>
  );
}
