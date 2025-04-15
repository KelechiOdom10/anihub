"use client";

import { useQuery } from "@urql/next";
import Link from "next/link";
import React from "react";

import { AnimeCard, AnimeCardSkeleton } from "~/components/ui/anime-card";
import { AnimeRelationsQuery } from "~/graphql/queries";

export const AnimeRelations = ({ animeId }: { animeId: number }) => {
  const [{ data, fetching }] = useQuery({
    query: AnimeRelationsQuery,
    variables: { id: animeId },
  });

  const animeRelations = data?.getAnimeRelations ?? [];
  const noRelations = !fetching && animeRelations.length === 0;

  return (
    <>
      {noRelations && <p>No related anime found.</p>}
      {animeRelations.length > 0 && (
        <div className="grid grid-cols-2 gap-5 md:flex md:flex-wrap">
          {animeRelations.map((anime, index) => (
            <Link prefetch key={anime.id} href={`/anime/${anime.id}`}>
              <AnimeCard
                anime={anime}
                className="md:w-52"
                loading={index < 3 ? "eager" : "lazy"}
              />
            </Link>
          ))}
        </div>
      )}
    </>
  );
};

export const AnimeRelationsSkeleton = () => (
  <div className="grid grid-cols-2 gap-5 md:flex md:flex-wrap">
    {Array(3)
      .fill(0)
      .map((i) => (
        <AnimeCardSkeleton key={i} className="md:w-52" />
      ))}
  </div>
);
