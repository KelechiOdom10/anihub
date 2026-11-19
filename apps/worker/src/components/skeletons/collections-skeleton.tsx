import { InfoCardSkeleton } from "../ui/info-card";

export function CollectionsSkeleton() {
  return (
    <section
      className="container mt-28 space-y-8 px-4 py-8"
      role="status"
      aria-label="Loading"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">My Collections</h1>
        <div className="h-9 w-36 animate-pulse rounded-md bg-zinc-800" />
      </div>
      <div className="grid items-start gap-6 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div
            key={index}
            className="min-w-0 space-y-4 rounded-lg border border-border p-4"
          >
            <InfoCardSkeleton />
            <div className="flex items-center gap-4">
              <div className="aspect-square w-9 animate-pulse rounded-full bg-zinc-800" />
              <div className="h-4 w-24 animate-pulse rounded-md bg-zinc-800" />
            </div>
            <div className="space-y-2">
              {Array.from({ length: 3 }, (_, item) => (
                <div key={item} className="flex items-center gap-3">
                  <div className="h-12 w-8 animate-pulse rounded bg-zinc-800" />
                  <div className="h-4 w-1/2 animate-pulse rounded-md bg-zinc-800" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
