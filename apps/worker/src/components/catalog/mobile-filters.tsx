import { useState } from "react";

import { FunnelIcon } from "../icons";
import { Button } from "../ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "../ui/sheet";
import { CatalogFilters, type CatalogFiltersProps } from "./catalog-filters";

export function MobileFilters(props: CatalogFiltersProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="default"
          size="icon"
          aria-label="Filters"
          className="flex md:hidden"
        >
          <FunnelIcon className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="flex w-10/12 flex-col gap-4 overflow-y-auto p-4 sm:max-w-screen-md"
      >
        <SheetTitle className="sr-only">Filters</SheetTitle>
        <SheetDescription className="sr-only">
          Narrow the catalog by year, season, genre, format and airing status.
        </SheetDescription>
        <CatalogFilters {...props} />
      </SheetContent>
    </Sheet>
  );
}
