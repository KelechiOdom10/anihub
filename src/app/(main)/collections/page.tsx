import { type Metadata } from "next";
import Image from "next/image";
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
        {data?.getCollections?.map((collection) => {
          const collectionImages =
            collection.items?.map((item) => ({
              url: item.animeImage ?? "/fallback-anime.avif",
              alt: `Anime image for collection ${collection.name}`,
            })) ?? [];

          // Fill remaining slots with fallback images until we have 3
          const fallbackImage = {
            url: "/fallback-anime.avif",
            alt: `Fallback image for collection ${collection.name}`,
          };
          const images = [...collectionImages];
          while (images.length < 3) {
            images.push(fallbackImage);
          }

          // Fisher-Yates shuffle algorithm
          for (let i = images.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            // @ts-expect-error index type issues
            [images[i], images[j]] = [images[j], images[i]];
          }

          return (
            <div key={collection.id} className="flex flex-col gap-2">
              <Link
                href={`/users/${collection.user?.username}/collections/${collection.id}`}
              >
                <InfoCard heading={collection.name} images={images} />
              </Link>
              <Link
                href={`/users/${collection.user?.username}`}
                className="group flex items-center gap-4"
              >
                <Image
                  src={collection.user?.avatar ?? "/female-avatar.png"}
                  alt="User avatar"
                  width={40}
                  height={40}
                  className="aspect-square w-9 rounded-full object-cover"
                />
                <span className="text-sm font-bold text-muted-foreground group-hover:text-white">
                  {collection.user?.username}
                </span>
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
