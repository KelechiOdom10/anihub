import { CheckIcon, MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { englishTitle } from "../lib/anime";
import type { Anime } from "../server/anime";
import { getCatalog } from "../server/functions";
import { AnimeCard } from "./ui/anime-card";
import { Button } from "./ui/button";

export function CollectionAnimePicker({
  selected,
  onChange,
}: {
  selected: Map<number, Anime>;
  onChange: (next: Map<number, Anime>) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Anime[]>([]);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const catalog = await getCatalog({ data: { page: 1 } });

        if (active && catalog.kind === "results") setResults(catalog.anime);
      } catch {
        if (active) setResults([]);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  const search = async (event: FormEvent) => {
    event.preventDefault();

    const value = query.trim();

    if (value.length > 0 && value.length < 3) {
      toast.error("Enter at least 3 characters");

      return;
    }

    if (!value) {
      setResults([]);

      return;
    }

    setPending(true);

    try {
      const catalog = await getCatalog({ data: { q: value, page: 1 } });

      setResults(catalog.kind === "results" ? catalog.anime : []);
    } catch {
      toast.error("Couldn't search MyAnimeList. Try again.");
    } finally {
      setPending(false);
    }
  };

  const toggle = (anime: Anime) => {
    const next = new Map(selected);

    if (next.has(anime.id)) next.delete(anime.id);
    else if (next.size >= 50) {
      toast.error("Add up to 50 titles");

      return;
    } else next.set(anime.id, anime);

    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium" id="select-anime-label">
          Select Anime
        </p>
        <p className="text-sm text-muted-foreground">
          {selected.size} selected
        </p>
      </div>
      <form
        role="search"
        onSubmit={search}
        className="flex flex-wrap items-center gap-2"
      >
        <div className="min-w-50 relative flex-1">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            aria-label="Search MyAnimeList"
            placeholder="Search anime"
            maxLength={100}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-9 w-full rounded-md border border-input bg-secondary/40 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
        <Button
          type="submit"
          variant="secondary"
          size="default"
          disabled={pending}
        >
          {pending ? "Searching…" : "Search"}
        </Button>
      </form>
      {results.length > 0 && (
        <ul
          aria-labelledby="select-anime-label"
          className="max-h-100 grid grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-4"
        >
          {results.map((anime) => {
            const chosen = selected.has(anime.id);

            return (
              <li key={anime.id}>
                <button
                  type="button"
                  aria-pressed={chosen}
                  aria-label={`${englishTitle(anime)}${chosen ? ", selected" : ""}`}
                  onClick={() => toggle(anime)}
                  className="relative block w-full rounded-xl text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <AnimeCard
                    anime={anime}
                    loading="lazy"
                    className={chosen ? "ring-2 ring-white" : "opacity-80"}
                  />
                  {chosen && (
                    <span className="absolute right-2 top-2 rounded-full bg-white p-1 text-black">
                      <CheckIcon className="h-3.5 w-3.5" />
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
