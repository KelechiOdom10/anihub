import { Suspense } from "react";

import { CatalogShell } from "./_components/catalog-shell";

import { getClient } from "~/graphql/client";
import { GenresQuery } from "~/graphql/queries";

export default async function CatalogPage() {
  const { data: genreData } = await getClient().query(GenresQuery, {});
  const allGenres = genreData?.getGenres ?? [];
  return (
    <Suspense fallback={<p>omo...</p>}>
      <div className="mt-32 max-w-full">
        <CatalogShell allGenres={allGenres} allProducers={[]} />
      </div>
    </Suspense>
  );
}
