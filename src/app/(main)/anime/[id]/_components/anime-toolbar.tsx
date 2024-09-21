"use client";

import {
  BookmarkIcon,
  CheckIcon,
  EyeOpenIcon,
  PlusIcon,
} from "@radix-ui/react-icons";
import Image from "next/image";

import { Button, type ButtonProps } from "~/components/ui/button";
import { type AnimeQueryData } from "~/graphql/queries";
import { useMediaQuery } from "~/lib/hooks/use-media-query";
import { getEnglishTitle } from "~/lib/utils/anime";
import { type TitleType } from "~/server/api/modules/shared";

export const AnimeToolbar = ({ anime }: { anime: AnimeQueryData }) => {
  const title = getEnglishTitle((anime.titles ?? []) as TitleType[]);
  const image = anime.image?.large ?? "/fallback-anime.avif";
  const isMobileDevice = useMediaQuery("(max-width: 768px)");
  const buttonSize: ButtonProps["size"] = isMobileDevice ? "default" : "xl";
  return (
    <div className="mx-auto flex max-w-5xl items-center gap-4 px-6 py-8 xl:max-w-7xl">
      <Image
        fetchPriority="high"
        priority
        src={image}
        alt={title}
        width={180}
        height={270}
        className="z-30 -mt-24 hidden rounded-md lg:block"
      />
      <div className="flex w-full flex-col gap-4 self-start">
        <h1 className="text-xl font-semibold lg:text-2xl">{title}</h1>
        {anime.score && (
          <p className="text-lg text-gray-400">★ {anime.score}</p>
        )}
        <div className="flex w-full flex-wrap items-center gap-2.5 md:justify-between">
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="secondary"
              size={buttonSize}
              leftIcon={<EyeOpenIcon />}
            >
              Watching
            </Button>
            <Button
              variant="secondary"
              size={buttonSize}
              leftIcon={<BookmarkIcon />}
            >
              To Watch
            </Button>
            <Button
              variant="secondary"
              size={buttonSize}
              leftIcon={<CheckIcon />}
            >
              Watched
            </Button>
          </div>
          <Button leftIcon={<PlusIcon />} variant="secondary" size={buttonSize}>
            Add to Collection
          </Button>
        </div>
      </div>
    </div>
  );
};
