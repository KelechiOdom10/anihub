import { ChevronDownIcon } from "@radix-ui/react-icons";
import { useId, useState, type ReactNode } from "react";

import {
  currentYear,
  FORMAT_OPTIONS,
  SEASON_OPTIONS,
  STATUS_OPTIONS,
  type CatalogSearch,
} from "../../lib/catalog";
import { cn } from "../../lib/utils";
import { genres } from "../../server/genres";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

export interface CatalogFiltersProps {
  search: CatalogSearch;
  onChange: (patch: Partial<CatalogSearch>) => void;
  onClear: () => void;
}

const firstYear = 1970;

function Section({
  title,
  open,
  children,
}: {
  title: string;
  open: boolean;
  children: ReactNode;
}) {
  return (
    <details className="group border-b" open={open}>
      <summary className="flex cursor-pointer list-none items-center justify-between py-4 font-medium transition-all hover:underline [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDownIcon className="h-4 w-4 shrink-0 transition-transform duration-200 group-open:rotate-180" />
      </summary>
      <div className="flex flex-col gap-2 pb-4 pt-0 text-sm">{children}</div>
    </details>
  );
}

function Option({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  const id = useId();

  return (
    <div className="flex items-center space-x-2">
      <Checkbox id={id} checked={checked} onCheckedChange={onCheckedChange} />
      <label
        htmlFor={id}
        className={cn("text-sm font-medium text-primary/60", {
          "text-primary": checked,
        })}
      >
        {label}
      </label>
    </div>
  );
}

function ShowAll({ all, onToggle }: { all: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      className="mt-2 self-start text-sm text-blue-600 hover:underline"
      onClick={onToggle}
    >
      {all ? "Show Less" : "View All"}
    </button>
  );
}

const toggle = (list: string | undefined, value: string, on: boolean) => {
  const values = (list?.split(",") ?? []).filter((item) => item !== value);
  const next = on ? [...values, value] : values;

  return next.length > 0 ? next.join(",") : undefined;
};

export function CatalogFilters({
  search,
  onChange,
  onClear,
}: CatalogFiltersProps) {
  const [allGenres, setAllGenres] = useState(false);
  const latest = currentYear() + 1;

  const years = Array.from(
    { length: latest - firstYear + 1 },
    (_, index) => latest - index
  );

  const pickedGenres = search.genres?.split(",") ?? [];
  const pickedSeasons = search.season?.split(",") ?? [];

  const shownGenres = allGenres
    ? genres
    : genres.filter(
        (genre, index) => index < 5 || pickedGenres.includes(genre)
      );

  const hasActiveFilters = Object.values(search).some(
    (value) => value !== undefined
  );

  return (
    <aside className="w-full px-4">
      <Section title="Year" open>
        <Select
          value={search.year ? String(search.year) : "any"}
          onValueChange={(value) =>
            onChange({ year: value === "any" ? undefined : Number(value) })
          }
        >
          <SelectTrigger aria-label="Year">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any</SelectItem>
            {years.map((year) => (
              <SelectItem key={year} value={String(year)}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Section>

      <Section title="Season" open>
        {SEASON_OPTIONS.map((season) => (
          <Option
            key={season.value}
            label={season.label}
            checked={pickedSeasons.includes(season.value)}
            onCheckedChange={(checked) =>
              onChange({
                season: toggle(search.season, season.value, checked),
              })
            }
          />
        ))}
      </Section>

      <Section title="Genres" open>
        {shownGenres.map((genre) => (
          <Option
            key={genre}
            label={genre}
            checked={pickedGenres.includes(genre)}
            onCheckedChange={(checked) =>
              onChange({ genres: toggle(search.genres, genre, checked) })
            }
          />
        ))}
        <ShowAll all={allGenres} onToggle={() => setAllGenres((all) => !all)} />
      </Section>

      <Section title="Format" open>
        {FORMAT_OPTIONS.map((format) => (
          <Option
            key={format.value}
            label={format.label}
            checked={search.type === format.value}
            onCheckedChange={(checked) =>
              onChange({ type: checked ? format.value : undefined })
            }
          />
        ))}
      </Section>

      <Section title="Airing Status" open>
        {STATUS_OPTIONS.map((status) => (
          <Option
            key={status.value}
            label={status.label}
            checked={search.status === status.value}
            onCheckedChange={(checked) =>
              onChange({ status: checked ? status.value : undefined })
            }
          />
        ))}
      </Section>

      {hasActiveFilters && (
        <Button size="default" fullWidth className="mt-6" onClick={onClear}>
          Clear All Filters
        </Button>
      )}
    </aside>
  );
}
