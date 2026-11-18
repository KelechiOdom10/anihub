import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";

import { AnimeList } from "../components/anime-list";
import { CatalogFilters } from "../components/catalog/catalog-filters";
import { CatalogSearch } from "../components/catalog/catalog-search";
import { MobileFilters } from "../components/catalog/mobile-filters";
import { SortDropdown } from "../components/catalog/sort-dropdown";
import { PageMessage } from "../components/page-message";
import { AnimeCardSkeleton } from "../components/ui/anime-card";
import FilterTags, { type FilterTag } from "../components/ui/filter-tags";
import {
  catalogSearchSchema,
  FORMAT_OPTIONS,
  SEASON_OPTIONS,
  STATUS_OPTIONS,
  toCatalogQuery,
  type CatalogSearch as Search,
} from "../lib/catalog";
import type { Catalog } from "../server/catalog";
import { getCatalog } from "../server/functions";

const unavailable = "MyAnimeList didn't respond. Please try again shortly.";

export const Route = createFileRoute("/_main/catalog")({
  validateSearch: catalogSearchSchema,
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const catalog: Catalog | { kind: "error" } = await getCatalog({
      data: { ...toCatalogQuery(deps), page: 1 },
    }).catch(() => ({ kind: "error" as const }));

    if (catalog.kind === "redirect")
      throw redirect({
        to: "/catalog",
        search: { ...deps, genres: catalog.genre },
        statusCode: 301,
      });

    return catalog;
  },
  head: ({ match }) => {
    const genres = match.search.genres?.split(",") ?? [];

    return {
      meta: [
        {
          title:
            genres.length === 1
              ? `${genres[0]} Anime | Anihub`
              : "Catalog | Anihub",
        },
      ],
    };
  },
  component: CatalogPage,
  pendingComponent: CatalogSkeleton,
  errorComponent: CatalogError,
});

const labelOf = (
  options: ReadonlyArray<{ value: string; label: string }>,
  value: string
) => options.find((option) => option.value === value)?.label ?? value;

function filterTags(search: Search): FilterTag[] {
  return [
    ...(search.q ? [{ key: "q", value: search.q, label: search.q }] : []),
    ...(search.year
      ? [
          {
            key: "year",
            value: String(search.year),
            label: String(search.year),
          },
        ]
      : []),
    ...(search.season?.split(",") ?? []).map((value) => ({
      key: "season",
      value,
      label: labelOf(SEASON_OPTIONS, value),
    })),
    ...(search.genres?.split(",") ?? []).map((value) => ({
      key: "genres",
      value,
      label: value,
    })),
    ...(search.type
      ? [
          {
            key: "type",
            value: search.type,
            label: labelOf(FORMAT_OPTIONS, search.type),
          },
        ]
      : []),
    ...(search.status
      ? [
          {
            key: "status",
            value: search.status,
            label: labelOf(STATUS_OPTIONS, search.status),
          },
        ]
      : []),
  ];
}

function CatalogPage() {
  const catalog = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  useEffect(() => {
    if (catalog.kind === "error") toast.error(unavailable);
  }, [catalog]);

  if (catalog.kind === "unsupported")
    return (
      <PageMessage
        heading="Genre not available"
        body={`"${catalog.value}" isn't one of the genres AniHub lists. Pick a category from the home page instead.`}
      />
    );

  const update = (patch: Partial<Search>) =>
    navigate({
      search: (previous) => ({ ...previous, ...patch }),
      resetScroll: false,
    });

  const clear = () => navigate({ search: {}, resetScroll: false });

  const removeTag = (key: string, value: string) => {
    if (key === "season" || key === "genres") {
      const rest = search[key]
        ?.split(",")
        .filter((item) => item !== value)
        .join(",");

      update({ [key]: rest || undefined });

      return;
    }

    update({ [key]: undefined });
  };

  const filters = { search, onChange: update, onClear: clear };
  const query = toCatalogQuery(search);

  const results =
    catalog.kind === "results"
      ? catalog
      : { anime: [], hasNextPage: false, subset: null };

  return (
    <div className="mt-28 max-w-full">
      <section className="mx-auto w-full px-4 py-8 md:container">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3 md:mb-6"></header>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5 lg:gap-8">
          <div className="hidden md:col-span-1 md:block">
            <h1 className="text-xl font-bold md:text-2xl">Catalog</h1>
            <div className="sticky top-24">
              <CatalogFilters {...filters} />
            </div>
          </div>
          <div className="flex w-full flex-col md:col-span-4">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <FilterTags
                  tags={filterTags(search)}
                  onRemove={removeTag}
                  onClearAll={clear}
                />
              </div>
              <div className="flex w-full flex-wrap items-center gap-4 md:ml-auto md:w-auto md:flex-nowrap md:self-end">
                <CatalogSearch q={search.q} onSearch={(q) => update({ q })} />
                <SortDropdown search={search} onChange={update} />
                <MobileFilters {...filters} />
              </div>
            </div>
            {results.subset && (
              <p className="mb-4 text-sm text-muted-foreground">
                {results.subset}
              </p>
            )}
            <AnimeList
              key={JSON.stringify(query)}
              query={query}
              initial={results}
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
      body={unavailable}
      onRetry={() => router.invalidate()}
    />
  );
}
