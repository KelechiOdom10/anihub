"use client";

import { useSearchParams } from "next/navigation";
import { useRouter } from "nextjs-toploader/app";
import { type FunctionComponent, useMemo } from "react";

import { AnimeFilters } from "./anime-filters";
import { AnimeList } from "./anime-list";
import { MobileAnimeFilter } from "./mobile-anime-filters";
import { SortDropdown } from "./sort-dropdown";

import FilterTags, { type FilterTag } from "~/components/ui/filter-tags";
import { type ProducerPreview, type GenrePreview } from "~/graphql/fragments";
import { ANIME_SORT_OPTIONS } from "~/lib/constants";
import { getEnglishTitle } from "~/lib/utils/anime";
import { type SearchAnimeQueryParams } from "~/server/api/modules/anime";
import { type TitleType } from "~/server/api/modules/shared";

interface CatalogShellProps {
  allGenres: Array<GenrePreview>;
  allProducers: Array<ProducerPreview>;
}

export const CatalogShell: FunctionComponent<CatalogShellProps> = ({
  allGenres,
  allProducers,
}) => {
  const router = useRouter();
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

  const filterTags = Array.from(searchParams.entries()).reduce(
    (acc: FilterTag[], [key, value]: [string, string]): FilterTag[] => {
      if (value && key !== "page") {
        if (key === "genres" || key === "producers") {
          const items = value.split(",").flatMap((item) => {
            if (key === "genres") {
              const genre = allGenres.find((genre) => genre?.id === item);
              return genre
                ? [{ key, value: genre.id ?? "", label: genre.name ?? "" }]
                : [];
            } else {
              const producer = allProducers.find(
                (producer) => producer?.id === item
              );
              return producer
                ? [
                    {
                      key,
                      value: producer.id ?? "",
                      label: getEnglishTitle(producer.titles as TitleType[]),
                    },
                  ]
                : [];
            }
          });

          return [...acc, ...items];
        } else {
          acc.push({ key, value, label: value });
        }
      }
      return acc;
    },
    [] as FilterTag[]
  );

  const removeFilter = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams.toString());
    if (key === "genres" || key === "producers") {
      const currentValues = newParams.get(key)?.split(",") ?? [];
      const updatedValues = currentValues.filter((v) => v !== value);
      if (updatedValues.length > 0) {
        newParams.set(key, updatedValues.join(","));
      } else {
        newParams.delete(key);
      }
    } else {
      newParams.delete(key);
    }
    router.push(`?${newParams.toString()}`, { scroll: false });
  };

  const clearAllFilters = () => {
    router.push(`?`, { scroll: false });
  };

  return (
    <section className="mx-auto w-full px-4 py-8 md:container">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3 md:mb-6"></header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-5 lg:gap-8">
        {/* Filter */}
        <div className="hidden md:col-span-1 md:block">
          <h1 className="text-xl font-bold md:text-2xl">Catalog</h1>
          <div className="sticky top-24">
            <AnimeFilters
              initialFilters={filters}
              genres={allGenres}
              producers={allProducers}
            />
          </div>
        </div>

        {/* Animes */}
        <div className="flex w-full flex-col md:col-span-4">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div className="lg:w-2/3">
              <FilterTags
                tags={filterTags}
                onRemove={removeFilter}
                onClearAll={clearAllFilters}
              />
            </div>
            <div className="flex items-center gap-4 md:ml-auto md:self-end">
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
          </div>
          <AnimeList query={filters} />
        </div>
      </div>
    </section>
  );
};
