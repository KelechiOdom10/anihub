import {
  createFileRoute,
  Link,
  redirect,
  useRouter,
} from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { watchStatusOptions } from "../components/watch-status-buttons";
import { Button } from "../components/ui/button";
import { getWatchList } from "../server/watch";

export const Route = createFileRoute("/_main/list")({
  loader: async () => {
    const list = await getWatchList();

    if (!list)
      throw redirect({ to: "/sign-in", search: { redirect: "/list" } });

    return list;
  },
  staleTime: 0,
  gcTime: 0,
  headers: () => ({ "Cache-Control": "private, no-store", Vary: "Cookie" }),
  head: () => ({ meta: [{ title: "My List | Anihub" }] }),
  component: MyList,
  pendingComponent: () => (
    <section className="container mt-28 py-8" role="status">
      Loading your list…
    </section>
  ),
  errorComponent: ListError,
});

function MyList() {
  const list = Route.useLoaderData();
  const content = useRef<HTMLElement>(null);
  const empty = watchStatusOptions.every(({ value }) => !list[value].length);

  useEffect(() => {
    if ("privateListGuard" in window) return;

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
      id="private-list"
      className="container mt-28 space-y-8 px-4 py-8"
    >
      <script
        dangerouslySetInnerHTML={{
          __html:
            'window.privateListGuard=true;addEventListener("pagehide",function(){var s=document.getElementById("private-list");if(s)s.hidden=true});addEventListener("pageshow",function(e){if(e.persisted&&document.getElementById("private-list"))location.reload()})',
        }}
      />
      <h1 className="text-2xl font-semibold">My List</h1>
      {empty ? (
        <div className="space-y-4 rounded-lg border p-6">
          <p>No anime yet.</p>
          <Button asChild variant="outline" size="default">
            <Link to="/catalog">Discover anime</Link>
          </Button>
        </div>
      ) : (
        watchStatusOptions.map(({ value, label, Icon }) => (
          <section
            key={value}
            aria-labelledby={`list-${value}`}
            className="space-y-4"
          >
            <h2
              id={`list-${value}`}
              className="flex items-center gap-2 text-lg font-semibold"
            >
              <Icon aria-hidden="true" className="h-4 w-4" />
              {label}
              <span className="text-sm font-normal text-muted-foreground">
                {list[value].length}
              </span>
            </h2>
            {list[value].length > 0 && (
              <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-8">
                {list[value].map((item) => (
                  <li key={item.animeId}>
                    <Link
                      to="/anime/$id"
                      params={{ id: String(item.animeId) }}
                      className="group block space-y-2 focus-visible:outline-none"
                    >
                      <img
                        src={item.image}
                        alt=""
                        loading="lazy"
                        width={160}
                        height={240}
                        className="aspect-[2/3] w-full rounded-md object-cover group-focus-visible:ring-2 group-focus-visible:ring-ring"
                      />
                      <span className="line-clamp-2 text-sm group-hover:underline">
                        {item.title}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))
      )}
    </section>
  );
}

function ListError() {
  const router = useRouter();

  useEffect(() => {
    toast.error("Couldn't load your list");
  }, []);

  return (
    <section className="container mt-28 space-y-4 py-8">
      <h1 className="text-2xl font-semibold">My List</h1>
      <Button onClick={() => router.invalidate()}>Retry</Button>
    </section>
  );
}
