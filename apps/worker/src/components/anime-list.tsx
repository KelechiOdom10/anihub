import { Link } from "@tanstack/react-router";
import { useState, type FunctionComponent } from "react";

import { englishTitle } from "../lib/anime";
import type { CatalogPage } from "../server/anime";
import { getCatalog } from "../server/functions";
import { AnimeCard, AnimeCardSkeleton } from "./ui/anime-card";
import { Button } from "./ui/button";

interface AnimeListProps {
  genre: string | null;
  initial: CatalogPage;
}

export const AnimeList: FunctionComponent<AnimeListProps> = ({
  genre,
  initial,
}) => {
  const [isPending, setPending] = useState(false);
  const [allAnime, setAllAnime] = useState(initial.anime);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(initial.hasNextPage);
  const [failed, setFailed] = useState(false);

  const isEmpty = allAnime.length === 0;

  const loadMore = async () => {
    if (!hasNextPage || isPending) return;

    setPending(true);

    const next = await getCatalog({
      data: { genres: genre ?? undefined, page: page + 1 },
    }).catch(() => null);

    setPending(false);

    if (next?.kind !== "results") {
      setFailed(true);

      return;
    }

    setFailed(false);
    setAllAnime((previous) => [...previous, ...next.anime]);
    setHasNextPage(next.hasNextPage);
    setPage(page + 1);
  };

  return (
    <section className="w-full">
      <div className="mb-4 grid grid-cols-2 gap-6 sm:grid-cols-3 md:mb-6 md:grid-cols-4 md:gap-8 lg:grid-cols-5">
        {isEmpty && (
          <p className="col-span-full flex h-40 items-center justify-center text-center">
            No results found. Please try refining your search.
          </p>
        )}
        {allAnime.map((anime, index) => (
          <Link
            aria-label={englishTitle(anime)}
            to="/anime/$id"
            params={{ id: String(anime.id) }}
            key={`${anime.id}-${index}`}
          >
            <AnimeCard
              anime={anime}
              className="mx-auto"
              loading={index < 20 ? "eager" : "lazy"}
            />
          </Link>
        ))}
        {isPending &&
          Array(10)
            .fill(0)
            .map((_, index) => <AnimeCardSkeleton key={index} />)}
      </div>
      {failed && (
        <p className="mb-4 text-center text-muted-foreground">
          MyAnimeList didn't respond. Please try again shortly.
        </p>
      )}
      {hasNextPage && (
        <Button onClick={loadMore} disabled={isPending} size="lg" fullWidth>
          {isPending ? "Loading..." : "Show More"}
        </Button>
      )}
    </section>
  );
};
