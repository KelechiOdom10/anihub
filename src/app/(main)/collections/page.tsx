import { type Metadata } from "next";
import Link from "next/link";

import { Button } from "~/components/ui/button";
import { InfoCard } from "~/components/ui/info-card";
import { getClient } from "~/graphql/client";
import { GetPublicCollectionsQuery } from "~/graphql/queries";

export const metadata: Metadata = {
  title: "Collections - AniHub",
  description: "Browse featured anime collections",
};

export default async function CollectionsPage() {
  const { data } = await getClient().query(GetPublicCollectionsQuery, {});

  return (
    <div className="container mx-auto mt-28 space-y-8 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Featured Collections</h1>
        <Button asChild>
          <Link href="/collections/new">+ Create New</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {data?.getCollections?.map((collection) => (
          <Link key={collection.id} href={`/collections/${collection.id}`}>
            <InfoCard
              heading={collection.name}
              images={
                collection.items?.map((item) => ({
                  url: item.animeImage ?? "/fallback-anime.avif",
                  alt: `Anime image for collection ${collection.name}`,
                })) ?? []
              }
            />
          </Link>
        ))}
      </div>

      <Button fullWidth asChild>
        <Link href="/collections/browse">Show More</Link>
      </Button>
    </div>
  );
}
