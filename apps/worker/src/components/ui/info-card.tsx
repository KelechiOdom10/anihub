import { type ReactNode } from "react";

import { coverHeight, coverSources, coverWidth } from "../../lib/image";
import { Skeleton } from "./skeleton";
import { Meteors } from "./meteors";

interface InfoCardProps {
  heading: ReactNode;
  images: Array<{
    url: string;
    alt: string;
  }>;
}

export const InfoCard = ({ heading, images }: InfoCardProps) => {
  return (
    <div className="relative flex h-full w-full flex-col items-center gap-8 overflow-hidden rounded-lg bg-zinc-900 px-6 pt-12 transition-transform duration-300 ease-in-out hover:scale-105">
      <Meteors number={10} />
      <h4 className="line-clamp-2 max-w-48 text-center text-xl font-medium">
        {heading}
      </h4>
      <div className="-mb-4 flex -space-x-6">
        {images.slice(0, 3).map((image, index) => (
          <img
            {...coverSources(image.url)}
            sizes="110px"
            width={coverWidth}
            height={coverHeight}
            loading="lazy"
            decoding="async"
            key={index}
            alt={image.alt}
            className={`aspect-[2/3] w-[110px] transform overflow-hidden rounded-lg border-[5px] border-zinc-900 object-cover shadow-lg transition-transform duration-300 ease-in-out hover:scale-105`}
            style={{
              transform: `rotate(${index % 2 === 0 ? 5 : -5}deg)`,
            }}
          />
        ))}
      </div>
    </div>
  );
};

export const InfoCardSkeleton = () => (
  <div className="relative flex h-full w-full flex-col items-center gap-8 overflow-hidden rounded-lg bg-zinc-900 px-6 pt-12">
    <div className="grid gap-3 pt-2">
      <Skeleton className="h-8 w-48 rounded-lg bg-zinc-800" />
      <Skeleton className="h-8 w-48 rounded-lg bg-zinc-800" />
    </div>
    <div className="-mb-4 flex -space-x-6">
      {Array.from({ length: 3 }, (_, index) => (
        <Skeleton
          key={index}
          className="aspect-[2/3] w-[110px] rounded-lg border-[5px] border-zinc-900 bg-zinc-800 shadow-lg"
          style={{ transform: `rotate(${index % 2 === 0 ? 5 : -5}deg)` }}
        />
      ))}
    </div>
  </div>
);
