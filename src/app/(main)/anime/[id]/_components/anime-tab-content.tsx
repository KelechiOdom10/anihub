import { Suspense, type FunctionComponent } from "react";

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
      return <div>Characters {animeId}</div>;
    case "staff":
      return <div>Staff {animeId}</div>;
    case "reviews":
      return <div>Reviews {animeId}</div>;
    default:
      return <AnimeOverview anime={anime} />;
  }
};
