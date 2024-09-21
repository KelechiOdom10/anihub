import { notFound } from "next/navigation";
import { Suspense } from "react";

import { AnimeHeader } from "./_components/anime-header";
import { AnimeTabContent } from "./_components/anime-tab-content";
import { AnimeTabsNavigation } from "./_components/anime-tabs-navigation";
import { AnimeToolbar } from "./_components/anime-toolbar";

import { getClient } from "~/graphql/client";
import { AnimeQuery } from "~/graphql/queries";

export default async function AnimePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { tab?: string };
}) {
  const animeId = parseInt(params.id);
  const { data } = await getClient().query(AnimeQuery, {
    id: animeId,
  });

  if (!data?.getAnime) {
    notFound();
  }
  const animeData = data.getAnime;
  const currentTab = searchParams.tab ?? "overview";

  return (
    <Suspense fallback={<div>Loading... </div>}>
      <AnimeHeader anime={animeData} />
      <AnimeToolbar anime={animeData} />
      <div className="mx-auto max-w-5xl px-4 py-8 xl:max-w-7xl">
        <AnimeTabsNavigation currentTab={currentTab} />
        <div className="px-4 py-6">
          <AnimeTabContent
            animeId={animeId}
            currentTab={currentTab}
            anime={animeData}
          />
        </div>
      </div>
    </Suspense>
  );
}
