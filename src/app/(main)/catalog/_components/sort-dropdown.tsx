"use client";

import { useSearchParams } from "next/navigation";
import { useRouter } from "nextjs-toploader/app";

import { AscendingOrderIcon, DescendingOrderIcon } from "~/components/icons";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { animeSortSchema } from "~/lib/validators/catalog";

export type SortOption<T extends string> = {
  value: T;
  label: string;
};

export type SortOptions<T extends string> = ReadonlyArray<SortOption<T>>;

export type SearchSort = "asc" | "desc";

interface SortDropdownProps<T extends string> {
  options: SortOptions<T>;
  defaultOrderBy?: T;
}

export function SortDropdown<T extends string>({
  options,
  defaultOrderBy,
}: SortDropdownProps<T>) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentSort = animeSortSchema
    .catch("asc")
    .parse(searchParams.get("sort"));

  const currentOrderBy =
    options.find((option) => option.value === searchParams.get("order_by"))
      ?.value ?? defaultOrderBy;

  const updateSearchParams = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    params.set(key, value);
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="flex items-center space-x-2">
      <Select
        value={currentOrderBy}
        onValueChange={(value) => updateSearchParams("order_by", value)}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Order by" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="ghost"
        size="icon"
        onClick={() =>
          updateSearchParams("sort", currentSort === "asc" ? "desc" : "asc")
        }
      >
        {currentSort === "asc" ? (
          <AscendingOrderIcon className="h-4 w-4" />
        ) : (
          <DescendingOrderIcon className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
