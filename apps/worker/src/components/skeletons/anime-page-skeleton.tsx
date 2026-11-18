export function AnimePageSkeleton() {
  return (
    <div role="status" aria-label="Loading">
      <div className="relative h-[250px] w-full overflow-hidden md:h-[300px]">
        <div className="h-full w-full animate-pulse bg-zinc-800" />
      </div>
      <div className="mx-auto flex max-w-5xl items-center gap-8 px-6 py-8 xl:max-w-7xl">
        <div className="z-30 -mt-24 hidden aspect-[2/3] w-[180px] animate-pulse rounded-md bg-zinc-800 lg:block" />
        <div className="flex w-full flex-col gap-3 self-start">
          <div className="h-7 w-2/3 animate-pulse rounded-md bg-zinc-800 lg:h-8" />
          <div className="h-6 w-20 animate-pulse rounded-md bg-zinc-800" />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {Array.from({ length: 3 }, (_, index) => (
              <div
                key={index}
                className="h-9 w-28 animate-pulse rounded-md bg-zinc-800"
              />
            ))}
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-5xl px-6 pb-16 xl:max-w-7xl">
        <div className="mb-8 flex gap-6 border-b border-zinc-800 pb-3">
          {Array.from({ length: 2 }, (_, index) => (
            <div
              key={index}
              className="h-5 w-20 animate-pulse rounded-md bg-zinc-800"
            />
          ))}
        </div>
        <div className="grid w-full grid-cols-1 gap-20 md:grid-cols-4 md:gap-24">
          <div className="col-span-1 flex flex-col gap-3">
            {Array.from({ length: 6 }, (_, index) => (
              <div
                key={index}
                className="h-4 w-full animate-pulse rounded-md bg-zinc-800"
              />
            ))}
          </div>
          <div className="col-span-1 flex flex-col gap-3 md:col-span-3">
            {Array.from({ length: 5 }, (_, index) => (
              <div
                key={index}
                className="h-4 w-full animate-pulse rounded-md bg-zinc-800"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
