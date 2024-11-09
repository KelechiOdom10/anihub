import Image from "next/image";

import { type AnimePreview } from "~/graphql/fragments";
import { cn } from "~/lib/utils";
import { getEnglishTitle } from "~/lib/utils/anime";
import { type TitleType } from "~/server/api/modules/shared";

interface AnimeCardProps {
  anime: AnimePreview;
  className?: string;
  loading: "eager" | "lazy";
}

export const AnimeCard = ({ anime, className, loading }: AnimeCardProps) => {
  const { titles, genres, year } = anime;
  const title = getEnglishTitle((titles ?? []) as TitleType[]);
  const genre = genres?.[0]?.name ?? "N/A";
  const extraInfo = year ? `${year}, ${genre}` : (genre ?? "");

  return (
    <div
      className={cn(
        "relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-gradient-to-b from-transparent via-background/10 to-background/75 shadow-lg",
        className
      )}
    >
      <Image
        fill
        loading={loading}
        className="absolute inset-0 -z-10 h-full w-full object-cover"
        src={
          anime?.image?.large ?? anime?.image?.default ?? "/fallback-anime.avif"
        }
        alt={title}
      />
      <div className="absolute inset-0 isolate flex items-end p-3">
        <div className="grid grid-cols-1 gap-1">
          <p className="font-semibold text-white">{title}</p>
          <p className="text-sm text-slate-300">{extraInfo}</p>
        </div>
      </div>
    </div>
  );
};

export const AnimeCardSkeleton = ({ className }: { className?: string }) => {
  return (
    <div
      className={cn(
        "relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-gradient-to-b from-transparent via-background/10 to-background/75 shadow-lg",
        className
      )}
    >
      <div className="absolute inset-0 -z-10 h-full w-full animate-pulse bg-neutral-700" />
      <div className="absolute inset-0 isolate flex items-end p-3">
        <div className="grid grid-cols-1 gap-1">
          <div className="h-4 w-2/3 animate-pulse rounded-md bg-neutral-700" />
          <div className="h-4 w-1/3 animate-pulse rounded-md bg-neutral-700" />
        </div>
      </div>
    </div>
  );
};
