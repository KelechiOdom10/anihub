import { Link } from "@tanstack/react-router";

import { englishTitle } from "../lib/anime";
import type { Categories } from "../server/anime";
import { InfoCard, InfoCardSkeleton } from "./ui/info-card";

export const GenresSection = ({ categories }: { categories: Categories }) => {
  return (
    <div className="flex flex-col space-y-8">
      <h3 className="text-xl font-bold text-white">Categories</h3>
      <div className="grid h-full grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        {categories.map(({ genre, anime }) => (
          <Link key={genre} to="/catalog" search={{ genres: genre }}>
            <InfoCard
              heading={
                <p>
                  The best <span className="italic">{genre}</span> Animes
                </p>
              }
              images={anime.map((entry) => ({
                url: entry.coverImage.extraLarge,
                alt: englishTitle(entry),
              }))}
            />
          </Link>
        ))}
      </div>
    </div>
  );
};

export const GenresSectionSkeleton = () => {
  return (
    <div className="flex flex-col space-y-8">
      <h3 className="text-xl font-bold text-white">Categories</h3>
      <div className="grid h-full grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <InfoCardSkeleton key={index} />
        ))}
      </div>
    </div>
  );
};
