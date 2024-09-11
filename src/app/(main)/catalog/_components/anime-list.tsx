import { useQuery } from "@urql/next";
import {
  useEffect,
  useState,
  useTransition,
  type FunctionComponent,
} from "react";

import { AnimeCard, AnimeCardSkeleton } from "~/components/ui/anime-card";
import { Button } from "~/components/ui/button";
import { type AnimePreview } from "~/graphql/fragments";
import { AnimeSearchQuery } from "~/graphql/queries";
import { type SearchAnimeQueryParams } from "~/server/api/modules/anime";

interface AnimeListProps {
  query: Partial<SearchAnimeQueryParams>;
}

export const AnimeList: FunctionComponent<AnimeListProps> = ({ query }) => {
  const [isPending, startTransition] = useTransition();
  const [allAnime, setAllAnime] = useState<Array<AnimePreview>>([]);
  const [page, setPage] = useState(1);
  const [{ data, fetching }] = useQuery({
    query: AnimeSearchQuery,
    variables: {
      // @ts-expect-error order-by type issues
      query: { ...query, page },
    },
  });
  const animeList = data?.getAnimesSearch.data ?? [];
  const isLoading = fetching || isPending;
  const isEmpty = !fetching && animeList.length === 0;

  useEffect(() => {
    // Reset accumulated data and page when query changes
    setAllAnime([]);
    setPage(1);
  }, [query]);

  useEffect(() => {
    if (animeList) {
      if (page === 1) {
        setAllAnime(animeList as Array<AnimePreview>);
      } else {
        setAllAnime((prev) => [...prev, ...animeList] as Array<AnimePreview>);
      }
    }
  }, [data, page]);

  const hasNextPage = data?.getAnimesSearch.pagination?.hasNextPage;

  const loadMore = () => {
    if (!hasNextPage) return;

    startTransition(() => {
      setPage((prevPage) => prevPage + 1);
    });
  };

  return (
    <section className="w-full">
      <div className="mb-4 grid grid-cols-2 gap-6 sm:grid-cols-3 md:mb-6 md:grid-cols-4 md:gap-8 lg:grid-cols-5">
        {isEmpty && (
          <p className="col-span-full text-center">
            No results found. Please try refining your search.
          </p>
        )}
        {allAnime.map((anime, index) => (
          <AnimeCard
            key={`${anime.id}-${index}`}
            anime={anime}
            className="mx-auto"
          />
        ))}
        {isLoading &&
          Array(10)
            .fill(0)
            .map((_, index) => <AnimeCardSkeleton key={index} />)}
      </div>
      {hasNextPage && (
        <Button onClick={loadMore} disabled={isLoading} size="lg" fullWidth>
          {isLoading ? "Loading..." : "Show More"}
        </Button>
      )}
    </section>
  );
};
