import { type FunctionComponent } from "react";

import { AnimeFilters, type AnimeFiltersProps } from "./anime-filters";

import { FunnelIcon } from "~/components/icons";
import { Button } from "~/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "~/components/ui/sheet";

export const MobileAnimeFilter: FunctionComponent<AnimeFiltersProps> = ({
  initialFilters,
  genres,
  producers,
}) => {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="default" size="icon" className="flex md:hidden">
          <FunnelIcon className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        className="flex w-10/12 flex-col overflow-y-auto p-4 sm:max-w-screen-md md:hidden"
        overlayClassName="md:hidden"
      >
        <AnimeFilters
          initialFilters={initialFilters}
          genres={genres}
          producers={producers}
        />
      </SheetContent>
    </Sheet>
  );
};
