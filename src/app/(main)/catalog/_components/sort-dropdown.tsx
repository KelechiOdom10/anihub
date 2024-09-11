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

  const currentSort = (searchParams.get("sort") as SearchSort) || "asc";
  const currentOrderBy = (searchParams.get("order_by") as T) ?? defaultOrderBy;

  console.log(currentOrderBy);

  const updateSearchParams = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    params.set(key, value);
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="flex items-center space-x-2">
      <Select
        value={currentOrderBy}
        onValueChange={(value: T) => updateSearchParams("order_by", value)}
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
