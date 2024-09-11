"use client";

import { useQuery } from "@urql/next";
import { type VariablesOf } from "gql.tada";
import Link from "next/link";
import { useMemo } from "react";

import { InfoCard } from "~/components/ui/info-card";
import { type GenrePreview } from "~/graphql/fragments";
import { AnimesByGenresQuery } from "~/graphql/queries";

interface GenresSectionProps {
  genres: NonNullable<Array<GenrePreview>>;
}

// Predefined array of genre combinations that return images
const genreCombinations = ["1", "4", "2"];
const getRandomCombination = (combinations: string[]) => {
  const randomIndex = Math.floor(Math.random() * combinations.length);
  return combinations[randomIndex];
};

export const GenresSection = ({ genres }: GenresSectionProps) => {
  const randomGenres = useMemo(
    () => getRandomCombination(genreCombinations),
    []
  );

  const queryVariables: VariablesOf<typeof AnimesByGenresQuery> = useMemo(
    () => ({
      query: {
        genres: randomGenres ?? "1",
        limit: 9,
      },
    }),
    [randomGenres]
  );

  const [{ data }] = useQuery({
    query: AnimesByGenresQuery,
    variables: queryVariables,
    requestPolicy: "cache-and-network",
    pause: !randomGenres,
  });

  const images =
    data?.getAnimesByGenres.map((anime) => ({
      url:
        anime?.image?.default ?? anime?.image?.small ?? "/fallback-anime.avif",
      alt: anime.title ?? "Anime",
    })) ?? [];

  // split the images into 3 for each card and let the next card have the next 3 images and fallback to first 3 images if there are less than 3 images
  const imagesForCards = [
    images.slice(0, 3),
    images.slice(3, 6),
    images.slice(6, 9),
  ];

  return (
    <div className="flex flex-col space-y-8">
      <h3 className="text-xl font-bold text-white">Categories</h3>
      <div className="grid h-full grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        {genres.map((genre, index) => (
          <Link key={genre.id} href={`/genre/${genre.id}`}>
            <InfoCard
              heading={
                <p>
                  The best <span className="italic">{genre.name}</span> Animes
                </p>
              }
              images={imagesForCards[index] ?? images.slice(0, 3)}
            />
          </Link>
        ))}
      </div>
    </div>
  );
};
