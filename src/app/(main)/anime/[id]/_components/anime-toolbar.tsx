"use client";

import {
  ListBulletIcon,
  EyeOpenIcon,
  BookmarkIcon,
  CheckIcon,
} from "@radix-ui/react-icons";
import { useQuery } from "@urql/next";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { CollectionModal } from "./collection-modal";

import { Button, type ButtonProps } from "~/components/ui/button";
import { MeQuery } from "~/graphql/queries";
import { type AnimeQueryData } from "~/graphql/queries";
import { useMediaQuery } from "~/lib/hooks/use-media-query";
import { getEnglishTitle } from "~/lib/utils/anime";
import { type TitleType } from "~/server/api/modules/shared";

export const AnimeToolbar = ({ anime }: { anime: AnimeQueryData }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [{ data }] = useQuery({
    query: MeQuery,
    requestPolicy: "cache-and-network",
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const title = getEnglishTitle((anime.titles ?? []) as TitleType[]);
  const image = anime.image?.large ?? "/fallback-anime.avif";
  const isMobileDevice = useMediaQuery("(max-width: 768px)");
  const buttonSize: ButtonProps["size"] = isMobileDevice ? "default" : "xl";

  const handleAddToCollection = () => {
    if (!data?.me) {
      toast.error("Authentication Required", {
        description: "Please log in to add anime to your collections.",
        position: "top-right",
      });
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    setIsModalOpen(true);
  };

  return (
    <div className="mx-auto flex max-w-5xl items-center gap-4 px-6 py-8 xl:max-w-7xl">
      <Image
        fetchPriority="high"
        loading="eager"
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
          <Button
            variant="secondary"
            size={buttonSize}
            leftIcon={<ListBulletIcon className="size-5" />}
            onClick={handleAddToCollection}
          >
            Add to Collection
          </Button>
        </div>
      </div>
      {anime.id && (
        <CollectionModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          animeId={Number(anime.id)}
          animeImage={anime.image?.large ?? ""}
        />
      )}
    </div>
  );
};
