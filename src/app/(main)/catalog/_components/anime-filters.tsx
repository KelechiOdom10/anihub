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
import { type ProducerPreview, type GenrePreview } from "~/graphql/fragments";
import {
  FORMAT_OPTIONS,
  RATING_OPTIONS,
  STATUS_OPTIONS,
} from "~/lib/constants";
import { cn } from "~/lib/utils";
import { getEnglishTitle } from "~/lib/utils/anime";
import { type SearchAnimeQueryParams } from "~/server/api/modules/anime";
import { type TitleType } from "~/server/api/modules/shared";

type Filters = Partial<SearchAnimeQueryParams>;

export interface AnimeFiltersProps {
  initialFilters: Filters;
  genres: Array<GenrePreview>;
  producers: Array<ProducerPreview>;
}

export const AnimeFilters: FunctionComponent<AnimeFiltersProps> = ({
  initialFilters,
  genres,
  producers,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [showAllGenres, setShowAllGenres] = useState(false);
  const [showAllProducers, setShowAllProducers] = useState(false);
  const genresToShow = useMemo(
    () => (showAllGenres ? genres : genres.slice(0, 5)),
    [showAllGenres, genres]
  );
  const producersToShow = useMemo(
    () => (showAllProducers ? producers : producers.slice(0, 5)),
    [showAllProducers, producers]
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
        defaultValue={["genres", "status", "format", "producers"]}
      >
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
                onClick={() => setShowAllGenres((prev) => !prev)}
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

        {/* Producer */}
        <AccordionItem value="producers">
          <AccordionTrigger>Producers</AccordionTrigger>
          <AccordionContent className="flex flex-col gap-4">
            {producersToShow.map((producer) => {
              if (!producer.id) return null;

              const title = getEnglishTitle(
                (producer.titles ?? []) as TitleType[]
              );
              const isProducerFilterEmpty = !initialFilters.producers;
              const isChecked = isProducerFilterEmpty
                ? false
                : initialFilters.producers
                    ?.split(",")
                    .includes(producer.id.toString());

              return (
                <div key={producer.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`producer-${producer.id}`}
                    checked={isChecked}
                    onCheckedChange={(checked) => {
                      const currentProducers =
                        initialFilters.producers?.split(",") ?? [];
                      const updatedProducers = checked
                        ? [...currentProducers, producer.id?.toString()]
                        : currentProducers.filter(
                            (id) => id !== producer.id?.toString()
                          );

                      updateFilters({
                        producers: updatedProducers.join(","),
                      });
                    }}
                  />
                  <label
                    htmlFor={`producer-${producer.id}`}
                    className={cn("text-sm font-medium text-primary/60", {
                      "text-primary": isChecked,
                    })}
                  >
                    {title}
                  </label>
                </div>
              );
            })}
            {producers.length > 5 && (
              <button
                className="mt-2 text-sm text-blue-600 hover:underline"
                onClick={() => setShowAllProducers((prev) => !prev)}
              >
                {showAllProducers ? "Show Less" : "View All"}
              </button>
            )}
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
