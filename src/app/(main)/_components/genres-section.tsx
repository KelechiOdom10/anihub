"use client";

import { useQuery } from "@urql/next";
import { type FragmentOf, type VariablesOf } from "gql.tada";
import Link from "next/link";
import { useMemo } from "react";

import { InfoCard } from "~/components/ui/info-card";
import { type GenrePreview } from "~/graphql/fragments";
import { AnimesByGenresQuery } from "~/graphql/queries";

interface GenresSectionProps {
  genres: NonNullable<Array<FragmentOf<typeof GenrePreview>>>;
}

// Predefined array of genre combinations that return images
const genreCombinations = ["1,46,18", "1,8", "1"];
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
        limit: 4,
      },
    }),
    [randomGenres]
  );

  const [{ data }] = useQuery({
    query: AnimesByGenresQuery,
    variables: queryVariables,
    requestPolicy: "cache-and-network",
  });

  const images =
    data?.getAnimesByGenres.map((anime) => ({
      url:
        anime?.image?.default ?? anime?.image?.small ?? "/fallback-anime.avif",
      alt: anime.title ?? "Anime",
    })) ?? [];

  return (
    <div className="flex flex-col space-y-8">
      <h3 className="text-xl font-bold text-white">Categories</h3>
      <div className="grid h-full grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        {genres.map((genre) => (
          <Link key={genre.id} href={`/genre/${genre.url}`}>
            <InfoCard
              heading={`The best ${genre.name} Animes`}
              images={images}
            />
          </Link>
        ))}
      </div>
    </div>
  );
};
