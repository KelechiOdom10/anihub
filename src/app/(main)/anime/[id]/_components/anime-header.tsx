"use client";

import { PlayIcon } from "@radix-ui/react-icons";
import Image from "next/image";
import { useState } from "react";

import { Button, type ButtonProps } from "~/components/ui/button";
import { Dialog, DialogContent } from "~/components/ui/dialog";
import { type AnimeQueryData } from "~/graphql/queries";
import { useMediaQuery } from "~/lib/hooks/use-media-query";
import { getEnglishTitle } from "~/lib/utils/anime";
import { type TitleType } from "~/server/api/modules/shared";

export const AnimeHeader = ({ anime }: { anime: AnimeQueryData }) => {
  const [open, setOpen] = useState(false);
  const title = getEnglishTitle((anime.titles ?? []) as TitleType[]);
  const image = anime.image?.large ?? "/fallback-anime.avif";

  const isMobileDevice = useMediaQuery("(max-width: 768px)");
  const buttonSize: ButtonProps["size"] = isMobileDevice ? "default" : "xl";

  const trailerUrl = anime?.trailer?.embedUrl ?? "";

  return (
    <div className="relative h-[250px] w-full overflow-hidden bg-black/20 pt-0 md:h-[300px]">
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
          className="h-full w-full object-cover object-[center_top]"
        />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl p-0">
          <div className="relative pb-[56.25%]">
            <iframe
              title="trailer"
              loading="lazy"
              frameBorder="0"
              allowFullScreen
              className="absolute inset-0 h-full w-full"
              src={`${trailerUrl}&controls=1&autoplay=1`}
            />
          </div>
        </DialogContent>
      </Dialog>

      <div className="container absolute -right-2 bottom-3 isolate z-40 flex items-end pb-0 lg:bottom-4 lg:right-6 lg:items-center">
        <Button
          size={buttonSize}
          className="ml-auto"
          onClick={() => setOpen(true)}
        >
          <PlayIcon className="mr-2 size-[18px] rounded-full border border-black p-1" />
          Watch Trailer
        </Button>
      </div>
    </div>
  );
};
