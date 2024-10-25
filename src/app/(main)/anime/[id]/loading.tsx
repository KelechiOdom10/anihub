export default function AnimePageLoading() {
  return (
    <div>
      {/* Header Skeleton */}
      <div className="relative h-[40vh] w-full overflow-hidden bg-gradient-to-b from-background via-background/40 to-background/70 pt-0 md:h-[45vh] md:to-background/60">
        <div className="h-full w-full animate-pulse bg-zinc-800" />
        <div className="container absolute -right-2 bottom-3 isolate z-40 flex items-end pb-0 lg:bottom-4 lg:right-6 lg:items-center">
          <div className="ml-auto h-10 w-32 animate-pulse rounded-md bg-zinc-800" />
        </div>
      </div>

      {/* Toolbar Skeleton */}
      <div className="mx-auto flex max-w-5xl items-center gap-4 px-6 py-8 xl:max-w-7xl">
        <div className="z-30 -mt-24 hidden aspect-[2/3] w-[180px] animate-pulse rounded-md bg-zinc-800 lg:block" />
        <div className="flex w-full flex-col gap-4 self-start">
          <div className="h-8 w-2/3 animate-pulse rounded-md bg-zinc-800" />
          <div className="h-6 w-20 animate-pulse rounded-md bg-zinc-800" />
          <div className="flex w-full flex-wrap items-center gap-2.5 md:justify-between">
            <div className="flex flex-wrap items-center gap-2.5">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-10 w-28 animate-pulse rounded-md bg-zinc-800"
                />
              ))}
            </div>
            <div className="h-10 w-40 animate-pulse rounded-md bg-zinc-800" />
          </div>
        </div>
      </div>

      {/* Tabs and Content Skeleton */}
      <div className="mx-auto max-w-5xl px-4 py-8 xl:max-w-7xl">
        <div className="mb-6">
          <div className="ml-1 flex max-w-xl gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-10 w-24 animate-pulse rounded-md bg-zinc-800"
              />
            ))}
          </div>
        </div>
        <div className="px-4 py-6">
          <div className="grid gap-4 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 w-full animate-pulse rounded-md bg-zinc-800"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
