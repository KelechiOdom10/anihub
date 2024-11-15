"use client";

import { BookmarkIcon } from "@radix-ui/react-icons";
import Image from "next/image";
import Link from "next/link";
import React from "react";

import { Button, type ButtonProps } from "~/components/ui/button";
import { type AnimePreview } from "~/graphql/fragments";
import { useMediaQuery } from "~/lib/hooks/use-media-query";

interface HeroProps {
  anime?: AnimePreview;
}

export const Hero = ({ anime }: HeroProps) => {
  const isMobileDevice = useMediaQuery("(max-width: 768px)");
  const buttonSize: ButtonProps["size"] = isMobileDevice ? "default" : "xl";

  const trailerId = anime?.trailer?.id ?? "";
  const trailerUrl = anime?.trailer?.embedUrl ?? "";

  return (
    <div className="relative h-[75vh] overflow-hidden bg-gradient-to-b from-background via-background/40 to-background/70 pt-0 md:h-[80vh] md:to-background/60 lg:h-[88vh]">
      <Image
        fill
        loading={isMobileDevice ? "eager" : "lazy"}
        className="absolute inset-0 isolate -z-20 block h-full w-full object-cover lg:hidden"
        src={anime?.image?.large ?? "/fallback-anime.avif"}
        alt={anime?.titles?.[0]?.title ?? ""}
      />
      <div className="relative h-full overflow-hidden pb-[56.25%]">
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
      </div>

      <div className="absolute inset-x-0 bottom-0 flex h-auto items-end pb-12 md:bottom-1/3 lg:items-center lg:pb-0">
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
