import {
  createFileRoute,
  Link,
  notFound,
  useRouter,
} from "@tanstack/react-router";
import { z } from "zod";
import { PageMessage } from "../components/page-message";
import { Button } from "../components/ui/button";
import { InfoCard } from "../components/ui/info-card";
import { getPublicCollections } from "../server/library";

export const Route = createFileRoute("/_main/users_/$userId")({
  validateSearch: z.object({
    page: z.coerce.number().int().min(1).max(1000).default(1).catch(1),
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ params, deps }) => {
    const collections = await getPublicCollections({
      data: { userId: params.userId, page: deps.page },
    });

    if (!collections) throw notFound();

    return collections;
  },
  head: ({ loaderData }) => ({
    meta: loaderData ? [{ title: `${loaderData.owner.name} | Anihub` }] : [],
  }),
  component: PublicProfile,
  notFoundComponent: () => (
    <PageMessage heading="User not found" body="This profile doesn't exist." />
  ),
  errorComponent: PublicProfileError,
});

function PublicProfile() {
  const { owner, collections, hasNextPage } = Route.useLoaderData();
  const { page } = Route.useSearch();

  return (
    <section className="container mt-28 max-w-5xl space-y-8 px-4 py-8">
      <div className="flex items-center gap-3">
        <img
          src={owner.avatar}
          alt=""
          width={48}
          height={48}
          className="h-12 w-12 rounded-full object-cover"
        />
        <div className="min-w-0">
          <h1 className="break-words text-2xl font-semibold">{owner.name}</h1>
          <p className="text-sm text-muted-foreground">Public collections</p>
        </div>
      </div>
      {collections.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-800 px-6 py-12 text-center text-sm text-muted-foreground">
          No public collections yet.
        </p>
      ) : (
        <div className="grid items-start gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((collection) => {
            const images = collection.items.map((item) => ({
              url: item.image,
              alt: item.title,
            }));

            while (images.length < 3)
              images.push({
                url: "/fallback-anime.avif",
                alt: collection.name,
              });

            return (
              <Link
                key={collection.id}
                to="/collections/$collectionId"
                params={{ collectionId: collection.id }}
                className="block space-y-2 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
              >
                <div className="[&>div]:!h-full [&>div]:!transform-none [&_*]:!animate-none [&_*]:!transition-none">
                  <InfoCard heading={collection.name} images={images} />
                </div>
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {collection.description ??
                    `${collection.items.length} titles`}
                </p>
              </Link>
            );
          })}
        </div>
      )}
      <nav aria-label="Collection pages" className="flex gap-4">
        {page > 1 && (
          <Button asChild variant="secondary" size="default">
            <Link
              to="/users/$userId"
              params={{ userId: owner.id }}
              search={{ page: page - 1 }}
            >
              Previous page
            </Link>
          </Button>
        )}
        {hasNextPage && (
          <Button asChild variant="secondary" size="default">
            <Link
              to="/users/$userId"
              params={{ userId: owner.id }}
              search={{ page: page + 1 }}
            >
              Next page
            </Link>
          </Button>
        )}
      </nav>
    </section>
  );
}

function PublicProfileError() {
  const router = useRouter();

  return (
    <PageMessage
      heading="Couldn't load these collections"
      body="Nothing has changed. Please try again."
      onRetry={() => router.invalidate()}
    />
  );
}
