"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useRouter } from "nextjs-toploader/app";
import { useCallback, useMemo, useState, type FunctionComponent } from "react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Slider } from "~/components/ui/slider";
import { type GenrePreview } from "~/graphql/fragments";
import {
  FORMAT_OPTIONS,
  RATING_OPTIONS,
  STATUS_OPTIONS,
} from "~/lib/constants";
import { cn } from "~/lib/utils";
import { type SearchAnimeQueryParams } from "~/server/api/modules/anime";

type Filters = Partial<SearchAnimeQueryParams>;

export interface AnimeFiltersProps {
  initialFilters: Filters;
  genres: Array<GenrePreview>;
}

export const AnimeFilters: FunctionComponent<AnimeFiltersProps> = ({
  initialFilters,
  genres,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [showAllGenres, setShowAllGenres] = useState(false);
  const genresToShow = useMemo(
    () => (showAllGenres ? genres : genres.slice(0, 5)),
    [showAllGenres, genres]
  );

  const updateFilters = useCallback(
    (newFilters: Filters) => {
      const params = new URLSearchParams(searchParams?.toString());
      Object.entries(newFilters).forEach(([key, value]) => {
        if (value) {
          params.set(key, value.toString());
        } else {
          params.delete(key);
        }
      });
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  const hasActiveFilters = searchParams?.toString() !== "";
  const clearFilters = useCallback(() => {
    router.push(pathname);
  }, [router, pathname]);

  return (
    <aside className="w-full px-4">
      <Accordion
        type="multiple"
        className="w-full"
        defaultValue={["genres", "status"]}
      >
        {/* year filter - range slider */}
        <AccordionItem value="year">
          <AccordionTrigger>Year</AccordionTrigger>
          <AccordionContent>
            <Slider
              min={1950}
              max={new Date().getFullYear()}
              value={[
                Number(initialFilters?.start_date ?? 1950),
                Number(initialFilters?.end_date ?? new Date().getFullYear()),
              ]}
              step={1}
              minStepsBetweenThumbs={1}
              onValueChange={(values) => {
                updateFilters({
                  start_date: values[0]?.toString(),
                  end_date: values[1]?.toString(),
                });
              }}
              className="w-full p-3"
              showTooltip
            />
          </AccordionContent>
        </AccordionItem>

        {/* Genres */}
        <AccordionItem value="genres">
          <AccordionTrigger>Genres</AccordionTrigger>
          <AccordionContent className="flex flex-col gap-2">
            {genresToShow.map((genre) => {
              if (!genre.id) return null;
              const isGenreFilterEmpty = !initialFilters.genres;
              const isChecked = isGenreFilterEmpty
                ? false
                : initialFilters.genres
                    ?.split(",")
                    .includes(genre.id.toString());

              return (
                <div key={genre.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`genre-${genre.id}`}
                    checked={isChecked}
                    onCheckedChange={(checked) => {
                      const currentGenres =
                        initialFilters.genres?.split(",") ?? [];
                      const updatedGenres = checked
                        ? [...currentGenres, genre.id?.toString()]
                        : currentGenres.filter(
                            (id) => id !== genre.id?.toString()
                          );

                      updateFilters({
                        genres: updatedGenres.join(","),
                      });
                    }}
                  />
                  <label
                    htmlFor={`genre-${genre.id}`}
                    className={cn("text-sm font-medium text-primary/60", {
                      "text-primary": isChecked,
                    })}
                  >
                    {genre.name}
                  </label>
                </div>
              );
            })}
            {genres.length > 5 && (
              <button
                className="mt-2 text-sm text-blue-600 hover:underline"
                onClick={() => setShowAllGenres(!showAllGenres)}
              >
                {showAllGenres ? "Show Less" : "View All"}
              </button>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* Status - Airing, Complete, Upcoming  */}
        <AccordionItem value="status">
          <AccordionTrigger>Airing Status</AccordionTrigger>
          <AccordionContent className="flex flex-col gap-4">
            {STATUS_OPTIONS.map((status) => {
              const value = status.value;
              const isChecked = initialFilters?.status === value;

              return (
                <div key={value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`status-${value}`}
                    checked={isChecked}
                    onCheckedChange={(checked) => {
                      updateFilters({
                        status: checked ? value : undefined,
                      });
                    }}
                  />
                  <label
                    htmlFor={`status-${value}`}
                    className={cn("text-sm font-medium text-primary/60", {
                      "text-primary": isChecked,
                    })}
                  >
                    {status.label}
                  </label>
                </div>
              );
            })}
          </AccordionContent>
        </AccordionItem>

        {/* Format */}
        <AccordionItem value="format">
          <AccordionTrigger>Format</AccordionTrigger>
          <AccordionContent className="flex flex-col gap-4">
            {FORMAT_OPTIONS.map((format) => {
              const formatValue = format.value;
              const isChecked = initialFilters.type === formatValue;

              return (
                <div key={formatValue} className="flex items-center space-x-2">
                  <Checkbox
                    id={`format-${formatValue}`}
                    checked={isChecked}
                    onCheckedChange={(checked) => {
                      updateFilters({
                        type: checked ? formatValue : undefined,
                      });
                    }}
                  />
                  <label
                    htmlFor={`format-${formatValue}`}
                    className={cn("text-sm font-medium text-primary/60", {
                      "text-primary": isChecked,
                    })}
                  >
                    {format.label}
                  </label>
                </div>
              );
            })}
          </AccordionContent>
        </AccordionItem>

        {/* Rating */}
        <AccordionItem value="rating">
          <AccordionTrigger>Rating</AccordionTrigger>
          <AccordionContent className="flex flex-col gap-4">
            {RATING_OPTIONS.map((rating) => {
              const ratingValue = rating.value;
              const isChecked = initialFilters.rating === ratingValue;

              return (
                <div key={ratingValue} className="flex items-center space-x-2">
                  <Checkbox
                    id={`rating-${ratingValue}`}
                    checked={isChecked}
                    onCheckedChange={(checked) => {
                      updateFilters({
                        rating: checked ? ratingValue : undefined,
                      });
                    }}
                  />
                  <label
                    htmlFor={`rating-${ratingValue}`}
                    className={cn("text-sm font-medium text-primary/60", {
                      "text-primary": isChecked,
                    })}
                  >
                    {rating.label}
                  </label>
                </div>
              );
            })}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {hasActiveFilters && (
        <Button fullWidth className="mt-6" onClick={clearFilters}>
          Clear All Filters
        </Button>
      )}
    </aside>
  );
};
