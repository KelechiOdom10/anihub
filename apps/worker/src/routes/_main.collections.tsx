import {
  createFileRoute,
  Link,
  redirect,
  useRouter,
} from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { CollectionVisibilitySwitch } from "../components/collection-visibility-switch";
import { CreateCollectionDialog } from "../components/create-collection-dialog";
import { CollectionsSkeleton } from "../components/skeletons/collections-skeleton";
import { Button } from "../components/ui/button";
import { InfoCard } from "../components/ui/info-card";
import { getLibrary, getLibraryItems } from "../server/library";

export const Route = createFileRoute("/_main/collections")({
  validateSearch: z.object({
    page: z.coerce.number().int().min(1).max(1000).default(1).catch(1),
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const library = await getLibrary({ data: deps });

    if (!library)
      throw redirect({ to: "/sign-in", search: { redirect: "/collections" } });

    return library;
  },
  staleTime: 0,
  gcTime: 0,
  headers: () => ({ "Cache-Control": "private, no-store", Vary: "Cookie" }),
  head: () => ({ meta: [{ title: "My Collections | Anihub" }] }),
  component: Collections,
  pendingComponent: CollectionsSkeleton,
  errorComponent: LibraryError,
});

type Collection = NonNullable<
  Awaited<ReturnType<typeof getLibrary>>
>["collections"][number];

function CollectionContents({
  collection,
  author,
  avatar,
}: {
  collection: Collection;
  author: string;
  avatar: string;
}) {
  const [contents, setContents] = useState({
    items: collection.items,
    hasNextPage: collection.hasNextPage,
  });

  const [page, setPage] = useState(1);
  const [pending, setPending] = useState(false);

  const more = async () => {
    if (pending) return;

    setPending(true);

    try {
      const result = await getLibraryItems({
        data: { collectionId: collection.id, page: page + 1 },
      });

      if (!result) {
        window.location.replace("/sign-in?redirect=%2Fcollections");

        return;
      }

      setContents({
        items: [...contents.items, ...result.items],
        hasNextPage: result.hasNextPage,
      });
      setPage(page + 1);
    } catch {
      toast.error("Couldn't load titles");
    } finally {
      setPending(false);
    }
  };

  return (
    <article className="min-w-0 space-y-4 rounded-lg border border-border p-4">
      <div>
        <InfoCard
          heading={collection.name}
          images={Array.from({ length: 3 }, (_, index) => ({
            url: collection.items[index]?.image ?? "/fallback-anime.avif",
            alt:
              collection.items[index]?.title ??
              `Fallback image for collection ${collection.name}`,
          }))}
        />
      </div>
      <div className="flex items-center gap-4">
        <img
          src={avatar}
          alt=""
          width={40}
          height={40}
          className="aspect-square w-9 rounded-full object-cover"
        />
        <span className="text-sm font-bold text-muted-foreground">
          {author}
        </span>
      </div>
      <CollectionVisibilitySwitch
        collectionId={collection.id}
        isPublic={collection.isPublic}
      />
      {collection.description && (
        <p className="whitespace-pre-wrap break-words text-sm">
          {collection.description}
        </p>
      )}
      {contents.items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No titles yet.</p>
      ) : (
        <ul className="space-y-2">
          {contents.items.map((item) => (
            <li key={item.id} className="flex min-w-0 items-center gap-3">
              <img
                src={item.image}
                alt=""
                loading="lazy"
                width={32}
                height={48}
                className="h-12 w-8 rounded object-cover"
              />
              {item.animeId ? (
                <Link
                  className="min-w-0 break-words text-sm underline-offset-4 hover:underline focus-visible:underline"
                  to="/anime/$id"
                  params={{ id: String(item.animeId) }}
                >
                  {item.title}
                </Link>
              ) : (
                <span className="text-sm text-muted-foreground">
                  Anime unavailable
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      {contents.hasNextPage && (
        <Button variant="outline" disabled={pending} onClick={more}>
          {pending ? "Loading…" : "Show more titles"}
        </Button>
      )}
    </article>
  );
}

function Collections() {
  const library = Route.useLoaderData();
  const { viewer } = Route.useRouteContext();

  const author =
    viewer?.name.trim() && !viewer.name.includes("@")
      ? viewer.name.trim()
      : "Anonymous";

  const { page } = Route.useSearch();
  const content = useRef<HTMLElement>(null);

  useEffect(() => {
    if ("privateLibraryGuard" in window) return;

    const hide = () => {
      if (content.current) content.current.hidden = true;
    };

    const restore = (event: PageTransitionEvent) => {
      if (event.persisted) window.location.reload();
    };

    window.addEventListener("pageshow", restore);
    window.addEventListener("pagehide", hide);

    return () => {
      window.removeEventListener("pageshow", restore);
      window.removeEventListener("pagehide", hide);
    };
  }, []);

  return (
    <section
      ref={content}
      id="private-library"
      className="container mt-28 space-y-8 px-4 py-8"
    >
      <script
        dangerouslySetInnerHTML={{
          __html:
            'window.privateLibraryGuard=true;addEventListener("pagehide",function(){var s=document.getElementById("private-library");if(s)s.hidden=true});addEventListener("pageshow",function(e){if(e.persisted&&document.getElementById("private-library"))location.reload()})',
        }}
      />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">My Collections</h1>
        <CreateCollectionDialog signedIn />
      </div>
      {library.collections.length === 0 ? (
        <div className="space-y-4 rounded-lg border p-6">
          <p>{page === 1 ? "No collections yet." : "No more collections."}</p>
          <Button asChild variant="outline">
            <Link to="/catalog">Discover anime</Link>
          </Button>
        </div>
      ) : (
        <div className="grid items-start gap-6 md:grid-cols-2 xl:grid-cols-3">
          {library.collections.map((collection) => (
            <CollectionContents
              key={collection.id}
              collection={collection}
              author={author}
              avatar={viewer?.avatar ?? "/anime-female-avatar.png"}
            />
          ))}
        </div>
      )}
      <nav aria-label="Collection pages" className="flex gap-4">
        {page > 1 && (
          <Button asChild variant="outline">
            <Link to="/collections" search={{ page: page - 1 }}>
              Previous page
            </Link>
          </Button>
        )}
        {library.hasNextPage && (
          <Button asChild variant="outline">
            <Link to="/collections" search={{ page: page + 1 }}>
              Next page
            </Link>
          </Button>
        )}
      </nav>
    </section>
  );
}

function LibraryError() {
  const router = useRouter();

  useEffect(() => {
    toast.error("Couldn't load collections");
  }, []);

  return (
    <section className="container mt-28 space-y-4 py-8">
      <h1 className="text-2xl font-semibold">My Collections</h1>
      <Button onClick={() => router.invalidate()}>Retry</Button>
    </section>
  );
}
