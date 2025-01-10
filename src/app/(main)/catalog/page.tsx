import { Suspense } from "react";

import CatalogPageSkeleton from "./_components/catalog-page-skeleton";
import { CatalogShell } from "./_components/catalog-shell";

import { getClient } from "~/graphql/client";
import { GenresQuery, ProducerSearchQuery } from "~/graphql/queries";

export default async function CatalogPage() {
  const { data: genreData } = await getClient().query(GenresQuery, {});
  const { data: producerData } = await getClient().query(ProducerSearchQuery, {
    query: {
      order_by: "favorites",
      sort: "desc",
    },
  });
  const allGenres = genreData?.getGenres ?? [];
  const allProducers = producerData?.getProducers?.data ?? [];

  return (
    <Suspense fallback={<CatalogPageSkeleton />}>
      <div className="mt-28 max-w-full">
        <CatalogShell allGenres={allGenres} allProducers={allProducers} />
      </div>
    </Suspense>
  );
}
