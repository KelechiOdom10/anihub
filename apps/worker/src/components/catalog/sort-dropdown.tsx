import { z } from "zod";

import { SORT_OPTIONS, type CatalogSearch } from "../../lib/catalog";
import { orders } from "../../server/anime";
import { AscendingOrderIcon, DescendingOrderIcon } from "../icons";
import { Button } from "../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

const relevance = "relevance";

interface SortDropdownProps {
  search: CatalogSearch;
  onChange: (patch: Partial<CatalogSearch>) => void;
}

export function SortDropdown({ search, onChange }: SortDropdownProps) {
  const order = search.order_by ?? (search.q ? undefined : "popularity");
  const direction = search.sort ?? (order === "title" ? "asc" : "desc");

  return (
    <div className="flex items-center space-x-2">
      <Select
        value={order ?? relevance}
        onValueChange={(value) => {
          const order = z.enum(orders).safeParse(value);

          onChange({
            order_by: order.success ? order.data : undefined,
            sort: undefined,
          });
        }}
      >
        <SelectTrigger aria-label="Sort by" className="w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {search.q && <SelectItem value={relevance}>Relevance</SelectItem>}
          {SORT_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
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
