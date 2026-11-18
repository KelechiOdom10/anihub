import { BookmarkIcon, CheckIcon, EyeOpenIcon } from "@radix-ui/react-icons";
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

export function WatchStatusButtons({
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

  const choose = async (value: WatchStatus) => {
    if (inFlight.current) return;

    const next = status === value ? null : value;

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

  return (
    <div className="flex flex-wrap items-center gap-2">
      {watchStatusOptions.map(({ value, label, Icon }) =>
        signedIn ? (
          <Button
            key={value}
            variant={status === value ? "default" : "secondary"}
            size="default"
            aria-pressed={status === value}
            onClick={() => void choose(value)}
          >
            <Icon className="mr-2 h-4 w-4" />
            {label}
          </Button>
        ) : (
          <Button key={value} variant="secondary" size="default" asChild>
            <Link to="/sign-in" search={{ redirect: `/anime/${animeId}` }}>
              <Icon className="mr-2 h-4 w-4" />
              {label}
            </Link>
          </Button>
        )
      )}
    </div>
  );
}
