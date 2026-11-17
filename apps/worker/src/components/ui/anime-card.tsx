import { cn } from "../../lib/utils";
import { englishTitle } from "../../lib/anime";
import type { Anime } from "../../server/anime";

const surface =
  "relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-gradient-to-b from-transparent via-background/10 to-background/75 shadow-lg";

type AnimeCardProps = {
  anime: Anime;
  className?: string;
  loading: "eager" | "lazy";
};

export function AnimeCard({ anime, className, loading }: AnimeCardProps) {
  const title = englishTitle(anime);
  const genre = anime.genres[0] ?? "N/A";
  const extraInfo = anime.seasonYear ? `${anime.seasonYear}, ${genre}` : genre;

  return (
    <div className={cn(surface, className)}>
      <img
        loading={loading}
        className="absolute inset-0 -z-10 h-full w-full object-cover"
        src={anime.coverImage.extraLarge}
        alt={title}
      />
      <div className="absolute inset-0 isolate flex items-end p-3">
        <div className="grid grid-cols-1 gap-1 text-left">
          <p className="font-semibold text-white">{title}</p>
          <p className="text-sm text-slate-300">{extraInfo}</p>
        </div>
      </div>
    </div>
  );
}

export function AnimeCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn(surface, className)}>
      <div className="absolute inset-0 -z-10 h-full w-full animate-pulse bg-neutral-700" />
      <div className="absolute inset-0 isolate flex items-end p-3">
        <div className="grid grid-cols-1 gap-1">
          <div className="h-4 w-2/3 animate-pulse rounded-md bg-neutral-700" />
          <div className="h-4 w-1/3 animate-pulse rounded-md bg-neutral-700" />
        </div>
      </div>
    </div>
  );
}
