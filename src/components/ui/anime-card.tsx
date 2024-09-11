import Image from "next/image";

import { type AnimePreview } from "~/graphql/fragments";
import { cn } from "~/lib/utils";
import { getEnglishTitle } from "~/lib/utils/anime";
import { type AnimeTitle } from "~/server/api/modules/anime";

interface AnimeCardProps {
  className?: string;
}

export const AnimeCard = ({ anime, className }: AnimeCardProps) => {
  const { titles, genres, year } = anime;
  const title = getEnglishTitle((titles ?? []) as AnimeTitle[]);
  const genre = genres?.[0]?.name ?? "N/A";
  const extraInfo = year ? `${year}, ${genre}` : genre ?? "";

  return (
    <div
      className={cn(
        "relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-gradient-to-b from-transparent via-background/10 to-background/75 shadow-lg",
        className
      )}
    >
      <Image
        width={300}
        height={500}
        className="absolute inset-0 -z-10 h-full w-full object-cover"
        src={
          anime?.image?.large ?? anime?.image?.default ?? "/fallback-anime.avif"
        }
        alt={title}
      />
      <div className="absolute inset-0 isolate flex items-end p-3">
        <div className="grid grid-cols-1 gap-1">
          <h3 className="font-semibold text-white">{title}</h3>
          <p className="text-sm text-slate-300">{extraInfo}</p>
        </div>
      </div>
    </div>
  );
};
