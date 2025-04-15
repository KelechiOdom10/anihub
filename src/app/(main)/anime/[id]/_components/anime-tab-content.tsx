"use client";

import { Suspense, type FunctionComponent } from "react";

import { AnimeCharacters, AnimeCharactersSkeleton } from "./anime-characters";
import { AnimeComments } from "./anime-comments";
import { AnimeOverview } from "./anime-overview";
import { AnimeRelations, AnimeRelationsSkeleton } from "./anime-relations";

import { type AnimeQueryData } from "~/graphql/queries";

interface AnimeTabContentProps {
  animeId: number;
  currentTab: string;
  anime: AnimeQueryData;
}

export const AnimeTabContent: FunctionComponent<AnimeTabContentProps> = ({
  animeId,
  currentTab,
  anime,
}) => {
  switch (currentTab) {
    case "overview":
      return <AnimeOverview anime={anime} />;
    case "relations":
      return (
        <Suspense fallback={<AnimeRelationsSkeleton />}>
          <AnimeRelations animeId={animeId} />
        </Suspense>
      );
    case "characters":
      return (
        <Suspense fallback={<AnimeCharactersSkeleton />}>
          <AnimeCharacters animeId={animeId} />
        </Suspense>
      );
    case "reviews":
      return <AnimeComments animeId={animeId} />;
    default:
      return <AnimeOverview anime={anime} />;
  }
};
