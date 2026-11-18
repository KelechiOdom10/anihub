import { Cross2Icon } from "@radix-ui/react-icons";
import { useEffect, useState } from "react";

import { FunnelIcon } from "../icons";
import { Button } from "../ui/button";
import { CatalogFilters, type CatalogFiltersProps } from "./catalog-filters";

export function MobileFilters(props: CatalogFiltersProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    const overflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <Button
        variant="default"
        size="icon"
        aria-label="Filters"
        aria-expanded={open}
        className="flex md:hidden"
        onClick={() => setOpen(true)}
      >
        <FunnelIcon className="h-5 w-5" />
      </Button>
      {open && (
        <div className="md:hidden">
          <div
            className="fixed inset-0 z-50 bg-black/80"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Filters"
            className="fixed inset-y-0 right-0 z-50 flex h-full w-10/12 flex-col gap-4 overflow-y-auto border-l bg-background p-4 shadow-lg sm:max-w-screen-md"
          >
            <button
              type="button"
              autoFocus
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <Cross2Icon className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </button>
            <CatalogFilters {...props} />
          </div>
        </div>
      )}
    </>
  );
}
