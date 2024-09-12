"use client";

import { useSearchParams } from "next/navigation";
import { type FunctionComponent, useMemo } from "react";

import { AnimeFilters } from "./anime-filters";
import { AnimeList } from "./anime-list";
import { MobileAnimeFilter } from "./mobile-anime-filters";
import { SortDropdown } from "./sort-dropdown";

import { type ProducerPreview, type GenrePreview } from "~/graphql/fragments";
import { ANIME_SORT_OPTIONS } from "~/lib/constants";
import { type SearchAnimeQueryParams } from "~/server/api/modules/anime";

interface CatalogShellProps {
  allGenres: Array<GenrePreview>;
  allProducers: Array<ProducerPreview>;
}

export const CatalogShell: FunctionComponent<CatalogShellProps> = ({
  allGenres,
  allProducers,
}) => {
  const searchParams = useSearchParams();
  const page = searchParams.get("page");
  const limit = searchParams.get("limit");

  const filters: Partial<SearchAnimeQueryParams> = useMemo(
    () => ({
      type: searchParams.get("type") as SearchAnimeQueryParams["type"],
      rating: searchParams.get("rating") as SearchAnimeQueryParams["rating"],
      sort:
        (searchParams.get("sort") as SearchAnimeQueryParams["sort"]) ?? "asc",
      order_by:
        (searchParams.get("order_by") as SearchAnimeQueryParams["order_by"]) ??
        "popularity",
      q: searchParams.get("q") ?? undefined,
      sfw: searchParams.get("sfw") === "true",
      start_date: searchParams.get("start_date") ?? undefined,
      end_date: searchParams.get("end_date") ?? undefined,
      genres: searchParams.get("genres") ?? undefined,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
      status:
        (searchParams.get("status") as SearchAnimeQueryParams["status"]) ??
        undefined,
      producers: searchParams.get("producers") ?? undefined,
    }),
    [searchParams]
  );

  return (
    <section className="mx-auto w-full px-4 py-8 md:container">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3 md:mb-6">
        <h1 className="text-xl font-bold md:text-2xl">Catalog</h1>
        <div className="flex items-center gap-4">
          <SortDropdown
            options={ANIME_SORT_OPTIONS}
            defaultOrderBy="popularity"
          />
          <MobileAnimeFilter
            initialFilters={filters}
            genres={allGenres}
            producers={allProducers}
          />
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-5 lg:gap-8">
        {/* Filter */}
        <div className="hidden md:col-span-1 md:block">
          <div className="sticky top-24">
            <AnimeFilters
              initialFilters={filters}
              genres={allGenres}
              producers={allProducers}
            />
          </div>
        </div>

        {/* Animes */}
        <div className="md:col-span-4">
          <AnimeList query={filters} />
        </div>
      </div>
    </section>
  );
};
