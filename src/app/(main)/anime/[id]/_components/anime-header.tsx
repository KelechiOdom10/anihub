"use client";

import { PlayIcon } from "@radix-ui/react-icons";
import Image from "next/image";

import { Button, type ButtonProps } from "~/components/ui/button";
import { type AnimeQueryData } from "~/graphql/queries";
import { useMediaQuery } from "~/lib/hooks/use-media-query";
import { getEnglishTitle } from "~/lib/utils/anime";
import { type TitleType } from "~/server/api/modules/shared";

export const AnimeHeader = ({ anime }: { anime: AnimeQueryData }) => {
  const title = getEnglishTitle((anime.titles ?? []) as TitleType[]);
  const image = anime.image?.large ?? "/fallback-anime.avif";

  const isMobileDevice = useMediaQuery("(max-width: 768px)");
  const buttonSize: ButtonProps["size"] = isMobileDevice ? "default" : "xl";

  const trailerId = anime?.trailer?.id ?? "";
  const trailerUrl = anime?.trailer?.embedUrl ?? "";

  return (
    <div className="relative h-[40vh] w-full overflow-hidden bg-gradient-to-b from-background via-background/40 to-background/70 pt-0 md:h-[45vh] md:to-background/60">
      <Image
        id="anime-header-image"
        fill
        fetchPriority="high"
        loading={isMobileDevice ? "eager" : "lazy"}
        className="absolute inset-0 isolate -z-20 h-full w-full object-cover lg:hidden"
        src={image}
        alt={title}
      />
      <div className="relative h-full overflow-hidden pb-[56.25%]">
        <iframe
          title="trailer"
          frameBorder="0"
          height="100%"
          width="100%"
          allowFullScreen
          loading="eager"
          className="pointer-events-none absolute -z-10 hidden select-none bg-center bg-no-repeat px-0 lg:block"
          src={`${trailerUrl}&controls=0&autoplay=1&mute=1&loop=1&playlist=${trailerId};showinfo=0`}
          onError={(e) => {
            (e.target as HTMLIFrameElement).style.display = "none";
            // show image fallback
            const image = document.getElementById(
              "anime-header-image"
            ) as HTMLImageElement;
            image.style.display = "block";
          }}
        />
      </div>

      <div className="container absolute -right-2 bottom-3 isolate z-40 flex items-end pb-0 lg:bottom-4 lg:right-6 lg:items-center">
        <Button size={buttonSize} className="ml-auto">
          <PlayIcon className="mr-2 size-[18px] rounded-full border border-black p-1" />
          Watch Trailer
        </Button>
      </div>
    </div>
  );
};
