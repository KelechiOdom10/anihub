"use client";

import { BookmarkIcon } from "@radix-ui/react-icons";
import Image from "next/image";
import Link from "next/link";
import React from "react";

import { Button, type ButtonProps } from "~/components/ui/button";
import { type AnimePreview } from "~/graphql/fragments";
import { useMediaQuery } from "~/lib/hooks/use-media-query";
import { getEnglishTitle } from "~/lib/utils/anime";
import { type TitleType } from "~/server/api/modules/shared";

interface HeroProps {
  anime?: AnimePreview;
}

export const Hero = ({ anime }: HeroProps) => {
  const isMobileDevice = useMediaQuery("(max-width: 768px)");
  const buttonSize: ButtonProps["size"] = isMobileDevice ? "default" : "xl";
  const title = getEnglishTitle((anime?.titles ?? []) as TitleType[]);
  const image = anime?.image?.large ?? "/fallback-anime.avif";

  return (
    <div className="relative z-0 h-[75vh] overflow-hidden bg-black/20 pt-0 md:h-[80vh] md:to-background/60 lg:h-[88vh]">
      <div className="absolute right-0 top-0 h-full max-h-full w-[400px] overflow-hidden md:w-[500px]">
        <div className="absolute inset-0 z-10 bg-gradient-to-r from-background from-5% via-background/60 via-30% to-transparent to-95%" />
        <div className="absolute inset-0 z-10 bg-gradient-to-b from-background/20 via-transparent to-background/30" />
        <div className="absolute inset-0 z-10 bg-black/25" />
        <Image
          id="anime-header-image"
          src={image}
          alt={title}
          width={500}
          height={300}
          priority
          loading="eager"
          className="h-full w-full object-cover object-[center_top]"
        />
      </div>
      {/* <div className="relative h-full overflow-hidden pb-[56.25%]">
        <iframe
          title="trailer"
          frameBorder="0"
          height="100%"
          width="100%"
          allowFullScreen
          loading="lazy"
          className="pointer-events-none absolute -z-10 hidden select-none bg-center bg-no-repeat px-0 lg:block"
          src={`${trailerUrl}&controls=0&autoplay=1&mute=1&loop=1&playlist=${trailerId};showinfo=0`}
        />
      </div> */}

      <div className="absolute inset-x-0 bottom-0 z-20 flex h-auto items-end pb-12 md:bottom-1/3 lg:items-center lg:pb-0">
        <div className="container text-balance">
          <h1 className="max-w-xl text-3xl font-bold text-white sm:text-4xl md:max-w-3xl md:text-5xl lg:text-7xl">
            {anime?.titles?.[0]?.title}
          </h1>
          <p className="my-4 line-clamp-2 max-w-lg text-base font-semibold text-slate-50 sm:text-lg md:text-xl">
            {anime?.synopsis}
          </p>
          <div className="flex flex-col gap-4 lg:flex-row">
            <Button asChild size={buttonSize}>
              <Link href={`/anime/${anime?.id}`}>Learn More</Link>
            </Button>
            <Button variant="secondary" size={buttonSize}>
              <BookmarkIcon className="mr-2 size-5 md:size-6" />
              Save to Watchlist
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
