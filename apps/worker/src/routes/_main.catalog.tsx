import {
  createFileRoute,
  redirect,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import { z } from "zod";

import { AnimeList } from "../components/anime-list";
import { PageMessage } from "../components/page-message";
import { AnimeCardSkeleton } from "../components/ui/anime-card";
import FilterTags from "../components/ui/filter-tags";
import { getCatalog } from "../server/functions";

const searchSchema = z.object({
  genres: z.union([z.string(), z.number()]).optional().catch(undefined),
});

export const Route = createFileRoute("/_main/catalog")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({
    genres: search.genres === undefined ? undefined : String(search.genres),
  }),
  loader: async ({ deps }) => {
    const catalog = await getCatalog({
      data: { genres: deps.genres, page: 1 },
    });

    if (catalog.kind === "redirect")
      throw redirect({
        to: "/catalog",
        search: { genres: catalog.genre },
        statusCode: 301,
      });

    return catalog;
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title:
          loaderData?.kind === "results" && loaderData.genre
            ? `${loaderData.genre} Anime | Anihub`
            : "Catalog | Anihub",
      },
    ],
  }),
  component: CatalogPage,
  pendingComponent: CatalogSkeleton,
  errorComponent: CatalogError,
});

function CatalogPage() {
  const catalog = Route.useLoaderData();
  const navigate = useNavigate();

  if (catalog.kind !== "results")
    return (
      <PageMessage
        heading="Genre not available"
        body={`"${catalog.kind === "unsupported" ? catalog.value : ""}" isn't one of the AniList genres AniHub lists. Pick a category from the home page instead.`}
      />
    );

  const tags = catalog.genre
    ? [{ key: "genres", value: catalog.genre, label: catalog.genre }]
    : [];

  return (
    <div className="mt-28 max-w-full">
      <section className="mx-auto w-full px-4 py-8 md:container">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3 md:mb-6"></header>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5 lg:gap-8">
          <div className="hidden md:col-span-1 md:block">
            <h1 className="text-xl font-bold md:text-2xl">Catalog</h1>
          </div>
          <div className="flex w-full flex-col md:col-span-4">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
              <div className="lg:w-2/3">
                <FilterTags
                  tags={tags}
                  onRemove={() => navigate({ to: "/catalog", search: {} })}
                  onClearAll={() => navigate({ to: "/catalog", search: {} })}
                />
              </div>
            </div>
            <AnimeList
              key={catalog.genre ?? "all"}
              genre={catalog.genre}
              initial={catalog}
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function CatalogSkeleton() {
  return (
    <section className="mx-auto mt-28 max-w-7xl px-4 py-8 md:container">
      <div className="grid grid-cols-2 gap-4 pt-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-8">
        {Array.from({ length: 8 }).map((_, i) => (
          <AnimeCardSkeleton key={i} />
        ))}
      </div>
    </section>
  );
}

function CatalogError() {
  const router = useRouter();

  return (
    <PageMessage
      heading="Anime data is unavailable"
      body="AniList didn't respond. Please try again shortly."
      onRetry={() => router.invalidate()}
    />
  );
}
