import { type Metadata } from "next";

import { AnimeCarousel } from "./_components/anime-carousel";
import { Hero } from "./_components/hero";

import { getClient } from "~/graphql/client";
import { TopAnimeQuery } from "~/graphql/queries";

export const metadata: Metadata = {
  title: "Next.js Lucia Auth Starter Template",
  description:
    "A Next.js starter template with nextjs and Lucia auth. Includes drizzle, trpc, react-email, tailwindcss and shadcn-ui",
};

export default async function Home() {
  const { data: recommended } = await getClient().query(TopAnimeQuery, {});
  const { data: popular } = await getClient().query(TopAnimeQuery, {
    query: {
      filter: "bypopularity",
      limit: 10,
    },
  });
  const heroAnime = recommended?.getTopAnimes?.[0];

  return (
    <>
      <Hero anime={heroAnime} />
      {recommended?.getTopAnimes && (
        <div className="container isolate mx-auto py-20 lg:-mt-64">
          <AnimeCarousel
            heading="Recommended for You"
            animeList={recommended.getTopAnimes}
          />
        </div>
      )}
      {popular?.getTopAnimes && (
        <div className="container mx-auto py-8">
          <AnimeCarousel
            heading="Popular Anime"
            animeList={popular.getTopAnimes}
          />
        </div>
      )}
    </>
  );
}
