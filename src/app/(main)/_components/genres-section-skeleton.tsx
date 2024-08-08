export const GenresSectionSkeleton = () => {
  return (
    <div className="flex flex-col space-y-8">
      <h3 className="text-xl font-bold text-white">Categories</h3>
      <div className="grid h-full grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="relative flex h-full w-full flex-col items-center gap-8 overflow-hidden rounded-lg bg-zinc-900 px-6 pt-12 transition-transform duration-300 ease-in-out hover:scale-105"
          >
            <div className="animate-pulse">
              <div className="my-2 h-8 w-48 rounded-lg bg-zinc-800"></div>
              <div className="h-8 w-48 rounded-lg bg-zinc-800"></div>
            </div>
            <div className="-mb-4 flex -space-x-6">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="border-5 h-32 w-24 rounded-lg border-zinc-900 bg-zinc-800 shadow-lg"
                ></div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
