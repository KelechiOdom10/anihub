import {
  BookmarkIcon,
  CheckIcon,
  ChevronDownIcon,
  Cross2Icon,
  EyeOpenIcon,
  PlusIcon,
} from "@radix-ui/react-icons";
import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  getWatchStatus,
  setWatchStatus,
  type WatchStatus,
} from "../server/watch";
import { Button } from "./ui/button";

export const watchStatusOptions = [
  { value: "watching", label: "Watching", Icon: EyeOpenIcon },
  { value: "plan_to_watch", label: "To Watch", Icon: BookmarkIcon },
  { value: "completed", label: "Watched", Icon: CheckIcon },
] as const;

export function WatchStatusControl({
  animeId,
  signedIn,
}: {
  animeId: number;
  signedIn: boolean;
}) {
  const [status, setStatus] = useState<WatchStatus | null>(null);
  const confirmed = useRef<WatchStatus | null>(null);
  const inFlight = useRef(false);
  const touched = useRef(false);
  const menu = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!signedIn) return;

    let active = true;

    const clear = () => {
      confirmed.current = null;
      setStatus(null);
    };

    const load = async () => {
      touched.current = false;

      try {
        const result = await getWatchStatus({ data: { animeId } });

        if (!active || touched.current || !result) return;

        confirmed.current = result.status;
        setStatus(result.status);
      } catch {
        if (active) toast.error("Couldn't load your status");
      }
    };

    const show = (event: PageTransitionEvent) => {
      if (event.persisted) void load();
    };

    clear();
    void load();
    window.addEventListener("pagehide", clear);
    window.addEventListener("pageshow", show);

    return () => {
      active = false;
      window.removeEventListener("pagehide", clear);
      window.removeEventListener("pageshow", show);
    };
  }, [animeId, signedIn]);

  useEffect(() => {
    if (!open) return;

    menu.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();

    const outside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !menu.current?.parentElement?.contains(event.target)
      )
        setOpen(false);
    };

    document.addEventListener("pointerdown", outside);

    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);

  const choose = async (next: WatchStatus | null) => {
    setOpen(false);

    if (inFlight.current || next === status) return;

    inFlight.current = true;
    touched.current = true;
    setStatus(next);

    const fail = (message: string) => {
      setStatus(confirmed.current);
      toast.error(message);
    };

    try {
      const result = await setWatchStatus({ data: { animeId, status: next } });

      if (result.kind === "saved") confirmed.current = result.status;
      else fail(result.message);
    } catch {
      fail("Couldn't save status");
    } finally {
      inFlight.current = false;
    }
  };

  if (!signedIn)
    return (
      <Button variant="secondary" size="default" asChild>
        <Link to="/sign-in" search={{ redirect: `/anime/${animeId}` }}>
          <PlusIcon className="mr-2 h-4 w-4" />
          To Watch
        </Link>
      </Button>
    );

  const current = watchStatusOptions.find((option) => option.value === status);

  const toggle = (
    <Button
      variant={current ? "default" : "secondary"}
      size="default"
      aria-haspopup="menu"
      aria-expanded={open}
      aria-label={current ? `${current.label}, change status` : "More statuses"}
      className={
        current ? "" : "rounded-l-none border-l border-l-black/40 px-2.5"
      }
      onClick={() => setOpen((value) => !value)}
    >
      {current && (
        <>
          <current.Icon className="mr-2 h-4 w-4" />
          {current.label}
        </>
      )}
      <ChevronDownIcon className={current ? "ml-2 h-4 w-4" : "h-4 w-4"} />
    </Button>
  );

  return (
    <div className="relative inline-flex">
      {!current && (
        <Button
          variant="secondary"
          size="default"
          className="rounded-r-none"
          onClick={() => void choose("plan_to_watch")}
        >
          <PlusIcon className="mr-2 h-4 w-4" />
          To Watch
        </Button>
      )}
      {toggle}
      {open && (
        <div
          ref={menu}
          role="menu"
          aria-label="Watch status"
          onKeyDown={(event) => {
            const items = [
              ...event.currentTarget.querySelectorAll<HTMLElement>(
                '[role="menuitem"]'
              ),
            ];

            const index = items.findIndex(
              (item) => item === document.activeElement
            );

            if (event.key === "Escape" || event.key === "Tab") {
              setOpen(false);

              if (event.key === "Escape")
                event.currentTarget.parentElement
                  ?.querySelector<HTMLElement>('[aria-haspopup="menu"]')
                  ?.focus();
            } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              items[
                (index + (event.key === "ArrowDown" ? 1 : -1) + items.length) %
                  items.length
              ]?.focus();
            }
          }}
          className="absolute left-0 top-full z-40 mt-1 min-w-44 rounded-lg border border-border bg-background p-1 text-sm shadow-lg"
        >
          {watchStatusOptions.flatMap(({ value, label, Icon }) =>
            value === status
              ? []
              : [
                  <button
                    key={value}
                    type="button"
                    role="menuitem"
                    onClick={() => void choose(value)}
                    className="flex w-full items-center rounded-md px-3 py-2 text-left hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {label}
                  </button>,
                ]
          )}
          {current && (
            <button
              type="button"
              role="menuitem"
              onClick={() => void choose(null)}
              className="flex w-full items-center rounded-md px-3 py-2 text-left text-muted-foreground hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
            >
              <Cross2Icon className="mr-2 h-4 w-4" />
              Remove from list
            </button>
          )}
        </div>
      )}
    </div>
  );
}
