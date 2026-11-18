import { ChevronDownIcon } from "@radix-ui/react-icons";

import { z } from "zod";

import { SORT_OPTIONS, type CatalogSearch } from "../../lib/catalog";
import { orders } from "../../server/anime";
import { AscendingOrderIcon, DescendingOrderIcon } from "../icons";
import { Button } from "../ui/button";

interface SortDropdownProps {
  search: CatalogSearch;
  onChange: (patch: Partial<CatalogSearch>) => void;
}

export function SortDropdown({ search, onChange }: SortDropdownProps) {
  const order = search.order_by ?? (search.q ? undefined : "popularity");
  const direction = search.sort ?? (order === "title" ? "asc" : "desc");

  return (
    <div className="flex items-center space-x-2">
      <div className="relative">
        <select
          aria-label="Sort by"
          value={order ?? ""}
          onChange={(event) => {
            const order = z.enum(orders).safeParse(event.target.value);

            onChange({
              order_by: order.success ? order.data : undefined,
              sort: undefined,
            });
          }}
          className="flex h-9 w-[180px] cursor-pointer appearance-none items-center rounded-md border border-input bg-background px-3 pr-8 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          {search.q && <option value="">Relevance</option>}
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50" />
      </div>
      {order && (
        <Button
          variant="ghost"
          size="icon"
          aria-label={direction === "asc" ? "Ascending" : "Descending"}
          onClick={() =>
            onChange({ sort: direction === "asc" ? "desc" : "asc" })
          }
        >
          {direction === "asc" ? (
            <AscendingOrderIcon className="h-4 w-4" />
          ) : (
            <DescendingOrderIcon className="h-4 w-4" />
          )}
        </Button>
      )}
    </div>
  );
}
