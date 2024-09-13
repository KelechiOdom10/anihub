import { Fragment } from "react";

import { Skeleton } from "~/components/ui/skeleton";

export const AnimeFiltersSkeleton = () => {
  const renderSkeletonItem = () => (
    <div className="flex flex-col space-y-4">
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-1/3" />
      <hr />
    </div>
  );

  return (
    <aside className="w-full">
      <div className="flex flex-col space-y-4">
        {[...Array(5)].map((_, index) => (
          <Fragment key={index}>{renderSkeletonItem()}</Fragment>
        ))}
      </div>
    </aside>
  );
};
