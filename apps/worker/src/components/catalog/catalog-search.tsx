import { MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

interface CatalogSearchProps {
  q: string | undefined;
  onSearch: (q: string | undefined) => void;
}

export function CatalogSearch({ q, onSearch }: CatalogSearchProps) {
  const [value, setValue] = useState(q ?? "");

  useEffect(() => setValue(q ?? ""), [q]);

  const submit = (event: FormEvent) => {
    event.preventDefault();

    const next = value.trim();

    if (next.length > 0 && next.length < 3) {
      toast.error("Enter at least 3 characters");

      return;
    }

    onSearch(next || undefined);
  };

  return (
    <form role="search" onSubmit={submit} className="relative w-full md:w-72">
      <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        name="q"
        aria-label="Search anime"
        placeholder="Search"
        maxLength={100}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="h-9 w-full rounded-md border border-input bg-secondary/40 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </form>
  );
}
