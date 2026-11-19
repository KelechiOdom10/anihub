import {
  createFileRoute,
  Link,
  redirect,
  useRouter,
} from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { watchStatusOptions } from "../components/watch-status-control";
import { Button } from "../components/ui/button";
import { getWatchList } from "../server/watch";

export const Route = createFileRoute("/_main/list")({
  validateSearch: z.object({
    status: z
      .enum(["watching", "plan_to_watch", "completed"])
      .optional()
      .catch(undefined),
  }),
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
  const tab = Route.useSearch().status ?? "watching";
  const content = useRef<HTMLElement>(null);

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
      <nav
        aria-label="List tabs"
        className="flex gap-6 border-b border-zinc-800"
      >
        {watchStatusOptions.map(({ value, label, Icon }) => (
          <Link
            key={value}
            to="/list"
            search={{ status: value }}
            aria-current={tab === value ? "page" : undefined}
            className={`-mb-px flex items-center gap-2 border-b-2 px-1 pb-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${tab === value ? "border-white text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            <Icon aria-hidden="true" className="h-4 w-4" />
            {label}
            <span className="text-muted-foreground">{list[value].length}</span>
          </Link>
        ))}
      </nav>
      {list[tab].length === 0 ? (
        <div className="space-y-4 rounded-lg border p-6">
          <p>No anime yet.</p>
          <Button asChild variant="outline" size="default">
            <Link to="/catalog">Discover anime</Link>
          </Button>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 lg:gap-8">
          {list[tab].map((item) => (
            <li key={item.animeId}>
              <Link
                to="/anime/$id"
                params={{ id: String(item.animeId) }}
                className="relative block aspect-[2/3] w-full overflow-hidden rounded-xl shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <img
                  src={item.image}
                  alt=""
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/90 to-transparent p-3 pt-10 font-semibold text-white">
                  {item.title}
                </span>
              </Link>
            </li>
          ))}
        </ul>
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
