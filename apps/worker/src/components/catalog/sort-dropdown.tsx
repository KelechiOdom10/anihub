import { z } from "zod";

import { SORT_OPTIONS, type CatalogSearch } from "../../lib/catalog";
import { orders } from "../../server/anime";
import { AscendingOrderIcon, DescendingOrderIcon } from "../icons";
import { Button } from "../ui/button";
import { NativeSelect } from "../ui/native-select";

interface SortDropdownProps {
  search: CatalogSearch;
  onChange: (patch: Partial<CatalogSearch>) => void;
}

export function SortDropdown({ search, onChange }: SortDropdownProps) {
  const order = search.order_by ?? (search.q ? undefined : "popularity");
  const direction = search.sort ?? (order === "title" ? "asc" : "desc");

  return (
    <div className="flex items-center space-x-2">
      <NativeSelect
        className="w-[180px]"
        aria-label="Sort by"
        value={order ?? ""}
        onChange={(event) => {
          const order = z.enum(orders).safeParse(event.target.value);

          onChange({
            order_by: order.success ? order.data : undefined,
            sort: undefined,
          });
        }}
      >
        {search.q && <option value="">Relevance</option>}
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </NativeSelect>
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
