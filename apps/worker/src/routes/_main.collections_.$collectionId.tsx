import {
  createFileRoute,
  Link,
  notFound,
  useRouter,
} from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageMessage } from "../components/page-message";
import { Button } from "../components/ui/button";
import { getPublicCollection } from "../server/library";

export const Route = createFileRoute("/_main/collections_/$collectionId")({
  loader: async ({ params }) => {
    const collection = await getPublicCollection({
      data: { id: params.collectionId, page: 1 },
    });

    if (!collection) throw notFound();

    return collection;
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [{ title: `${loaderData.collection.name} | Anihub` }]
      : [],
  }),
  component: PublicCollection,
  notFoundComponent: () => (
    <PageMessage
      heading="Collection not found"
      body="This collection doesn't exist or isn't public."
    />
  ),
  errorComponent: PublicCollectionError,
});

type PublicCollection = NonNullable<
  Awaited<ReturnType<typeof getPublicCollection>>
>;

function PublicCollection() {
  const initial = Route.useLoaderData();
  const [data, setData] = useState<PublicCollection>(initial);
  const [page, setPage] = useState(1);
  const [pending, setPending] = useState(false);

  const more = async () => {
    if (pending) return;

    setPending(true);

    try {
      const next = await getPublicCollection({
        data: { id: data.collection.id, page: page + 1 },
      });

      if (next) {
        setData({
          collection: data.collection,
          items: [...data.items, ...next.items],
          hasNextPage: next.hasNextPage,
        });
        setPage(page + 1);
      }
    } catch {
      toast.error("Couldn't load more titles. Please try again.");
    } finally {
      setPending(false);
    }
  };

  const { collection, items, hasNextPage } = data;

  return (
    <section className="container mt-28 max-w-5xl space-y-8 px-4 py-8">
      <div className="space-y-4">
        <Link
          to="/users/$userId"
          params={{ userId: collection.ownerId }}
          className="flex w-fit items-center gap-3 rounded-full py-1 pr-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
        >
          <img
            src={collection.owner.avatar}
            alt=""
            width={36}
            height={36}
            className="h-9 w-9 rounded-full object-cover"
          />
          {collection.owner.name}
        </Link>
        <h1 className="text-2xl font-semibold">{collection.name}</h1>
        {collection.description && (
          <p className="max-w-3xl whitespace-pre-wrap break-words text-sm leading-relaxed text-zinc-300">
            {collection.description}
          </p>
        )}
      </div>
      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-800 px-6 py-12 text-center text-sm text-muted-foreground">
          No titles in this collection yet.
        </p>
      ) : (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {items.map((item) => (
            <li key={item.id} className="min-w-0">
              {item.animeId ? (
                <Link
                  to="/anime/$id"
                  params={{ id: String(item.animeId) }}
                  className="group block space-y-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <img
                    src={item.image}
                    alt=""
                    loading="lazy"
                    width={180}
                    height={270}
                    className="aspect-[2/3] w-full rounded-md object-cover transition-opacity group-hover:opacity-80"
                  />
                  <p className="line-clamp-2 text-xs text-zinc-300">
                    {item.title}
                  </p>
                </Link>
              ) : (
                <div className="space-y-1.5">
                  <img
                    src={item.image}
                    alt=""
                    loading="lazy"
                    width={180}
                    height={270}
                    className="aspect-[2/3] w-full rounded-md object-cover"
                  />
                  <p className="text-xs text-muted-foreground">
                    Anime unavailable
                  </p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {hasNextPage && (
        <Button
          variant="secondary"
          size="default"
          disabled={pending}
          onClick={more}
        >
          {pending ? "Loading…" : "Show more titles"}
        </Button>
      )}
    </section>
  );
}

function PublicCollectionError() {
  const router = useRouter();

  return (
    <PageMessage
      heading="Couldn't load this collection"
      body="Nothing has changed. Please try again."
      onRetry={() => router.invalidate()}
    />
  );
}
