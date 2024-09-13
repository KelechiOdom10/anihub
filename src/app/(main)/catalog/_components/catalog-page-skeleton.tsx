import { AnimeFiltersSkeleton } from "./anime-filters-skeleton";

import { AnimeCardSkeleton } from "~/components/ui/anime-card";
import { Skeleton } from "~/components/ui/skeleton";

export default function CatalogPageSkeleton() {
  return (
    <section className="mx-auto mt-28 max-w-7xl px-4 py-8 md:container">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4 lg:gap-8">
        {/* Filter */}
        <div className="mt-2 hidden gap-8 md:col-span-1 md:flex md:flex-col">
          <Skeleton className="h-4 w-1/2" />
          <AnimeFiltersSkeleton />
        </div>

        {/* Products */}
        <div className="md:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <Skeleton className="h-4 w-1/4" />
            <div className="flex items-center gap-4">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-1/4" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-8">
            {Array.from({ length: 8 }).map((_, i) => (
              <AnimeCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
