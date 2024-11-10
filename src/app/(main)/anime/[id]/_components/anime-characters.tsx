"use client";

import React from "react";
import { useQuery } from "urql";

import { AnimeCardSkeleton } from "~/components/ui/anime-card";
import { AnimeCharacterCard } from "~/components/ui/anime-character-card";
import { AnimeCharactersQuery } from "~/graphql/queries";

export const AnimeCharacters = ({ animeId }: { animeId: number }) => {
  const [{ data, fetching }] = useQuery({
    query: AnimeCharactersQuery,
    variables: { id: animeId },
  });

  const animeCharacters = data?.getAnimeCharacters ?? [];
  const noRelations = !fetching && animeCharacters.length === 0;

  return (
    <>
      {noRelations && <p>No related anime found.</p>}
      {animeCharacters.length > 0 && (
        <div className="grid grid-cols-2 gap-5 md:flex md:flex-wrap">
          {animeCharacters.map((character, index) => (
            <AnimeCharacterCard
              key={character.character?.id}
              characterData={character}
              className="md:w-52"
              loading={index < 3 ? "eager" : "lazy"}
            />
          ))}
        </div>
      )}
    </>
  );
};

export const AnimeCharactersSkeleton = () => (
  <div className="grid grid-cols-2 gap-5 md:flex md:flex-wrap">
    {Array(3)
      .fill(0)
      .map((i) => (
        <AnimeCardSkeleton key={i} className="md:w-52" />
      ))}
  </div>
);
