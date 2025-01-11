import { type Metadata } from "next";
import dynamic from "next/dynamic";
import { notFound } from "next/navigation";

import { AnimeHeader } from "./_components/anime-header";
import { AnimeTabContent } from "./_components/anime-tab-content";
import { AnimeToolbar } from "./_components/anime-toolbar";

import { getClient } from "~/graphql/client";
import { AnimeQuery } from "~/graphql/queries";
import { getEnglishTitle } from "~/lib/utils/anime";
import { type TitleType } from "~/server/api/modules/shared";

const AnimeTabsNavigation = dynamic(
  () =>
    import("./_components/anime-tabs-navigation").then(
      (mod) => mod.AnimeTabsNavigation
    ),
  {
    ssr: true,
  }
);

export const generateMetadata = async ({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> => {
  const animeId = parseInt(params.id);
  const { data } = await getClient().query(AnimeQuery, {
    id: animeId,
  });

  if (!data?.getAnime) {
    notFound();
  }

  const animeData = data.getAnime;
  const title = `${getEnglishTitle(
    (animeData.titles ?? []) as TitleType[]
  )} | Anihub`;
  const description = animeData.synopsis ?? "";
  const image = animeData.image?.large ?? "/fallback-anime.avif";
  const url = `/anime/${animeId}`;
  const twitterCard = "summary_large_image";
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: twitterCard,
      title,
      description,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
  };
};

export default async function AnimePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const animeId = parseInt(params.id);
  const { data } = await getClient().query(AnimeQuery, {
    id: animeId,
  });

  if (!data?.getAnime) {
    notFound();
  }
  const animeData = data.getAnime;
  const currentTab = (searchParams?.tab as string) ?? "overview";

  return (
    <>
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
    </>
  );
}
