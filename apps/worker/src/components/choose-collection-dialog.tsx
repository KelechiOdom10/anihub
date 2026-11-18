import { Cross2Icon, ListBulletIcon } from "@radix-ui/react-icons";
import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { getMembership, setMembership } from "../server/library";
import { Button } from "./ui/button";

type Membership = NonNullable<Awaited<ReturnType<typeof getMembership>>>;

export function ChooseCollectionDialog({
  animeId,
  signedIn,
}: {
  animeId: number;
  signedIn: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const inFlight = useRef(false);
  const [collections, setCollections] = useState<Membership["collections"]>([]);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [pages, setPages] = useState(0);
  const [changes, setChanges] = useState<Map<string, boolean>>(new Map());
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [signedOut, setSignedOut] = useState(false);
  const returnPath = `/anime/${animeId}`;

  useEffect(() => {
    const clear = () =>
      flushSync(() => {
        dialog.current?.close();
        setCollections([]);
        setChanges(new Map());
        setPages(0);
      });

    window.addEventListener("pagehide", clear);

    return () => window.removeEventListener("pagehide", clear);
  }, []);

  if (!signedIn)
    return (
      <Button variant="secondary" asChild>
        <Link to="/sign-in" search={{ redirect: returnPath }}>
          <ListBulletIcon className="mr-2 h-4 w-4" />
          Add to Collection
        </Link>
      </Button>
    );

  const load = async (page: number) => {
    setLoading(true);
    setError("");

    try {
      const result = await getMembership({ data: { animeId, page } });

      if (!result) {
        setSignedOut(true);
        setError(
          "Your session has ended. Sign in again to choose collections."
        );

        return;
      }

      setCollections((current) =>
        page === 1 ? result.collections : [...current, ...result.collections]
      );
      setHasNextPage(result.hasNextPage);
      setPages(page);
    } catch {
      setError("Couldn't load your collections. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const open = () => {
    setChanges(new Map());
    setStatus("");
    setSignedOut(false);
    dialog.current?.showModal();
    void load(1);
  };

  const close = () => {
    if (inFlight.current) return;

    dialog.current?.close();
  };

  const toggle = (id: string, current: boolean) =>
    setChanges((previous) => {
      const next = new Map(previous);

      if (next.has(id)) next.delete(id);
      else next.set(id, !current);

      return next;
    });

  const save = async () => {
    if (inFlight.current || !changes.size) return;

    inFlight.current = true;
    setPending(true);
    setError("");
    setStatus("");

    const entries = [...changes];

    try {
      const result = await setMembership({
        data: {
          animeId,
          add: entries.flatMap(([id, add]) => (add ? [id] : [])),
          remove: entries.flatMap(([id, add]) => (add ? [] : [id])),
        },
      });

      if (result.kind !== "saved") {
        setError(result.message);
        setSignedOut(result.kind === "signed-out");

        return;
      }

      setChanges(new Map());
      setStatus(
        `Updated ${result.changed} collection${result.changed === 1 ? "" : "s"}.`
      );
      await load(1);
    } catch {
      setError(
        "Couldn't confirm the save. Your selections are still here, and saving again is safe."
      );
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  };

  const busy = pending || loading;

  return (
    <>
      <Button ref={trigger} variant="secondary" onClick={open}>
        <ListBulletIcon className="mr-2 h-4 w-4" />
        Add to Collection
      </Button>
      <dialog
        ref={dialog}
        aria-labelledby="choose-collection-title"
        aria-describedby="choose-collection-description"
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        onClose={() => trigger.current?.focus()}
        onKeyDown={(event) => {
          if (event.key !== "Tab") return;

          const controls = event.currentTarget.querySelectorAll<HTMLElement>(
            "input:not([disabled]), button:not([disabled]), a[href]"
          );

          const first = controls[0];
          const last = controls[controls.length - 1];

          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }}
        className="fixed inset-0 z-50 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-lg border border-border bg-background p-6 text-foreground shadow-lg backdrop:bg-black/80"
      >
        <h2
          id="choose-collection-title"
          className="text-center text-lg font-semibold leading-none tracking-tight sm:text-left"
        >
          Add to Collection
        </h2>
        <p
          id="choose-collection-description"
          className="mt-2 text-center text-sm text-muted-foreground sm:text-left"
        >
          {collections.length || !pages
            ? "Select the collections you want this anime to be in."
            : "You don't have any collections yet. Use Create collection to start one."}
        </p>
        <div className="grid gap-4 py-4" aria-busy={busy}>
          {collections.length > 0 && (
            <div className="relative">
              <ul className="max-h-[400px] space-y-2 overflow-y-auto pb-4 pr-2">
                {collections.map((collection) => {
                  const change = changes.get(collection.id);
                  const checked = change ?? collection.hasAnime;

                  return (
                    <li key={collection.id}>
                      <label className="group relative flex cursor-pointer items-center gap-x-4 rounded-lg border border-border bg-background p-1.5 hover:bg-accent/50 has-[:focus-visible]:ring-1 has-[:focus-visible]:ring-ring">
                        <input
                          type="checkbox"
                          className="absolute right-4 top-1/3 h-4 w-4 accent-primary"
                          checked={checked}
                          disabled={pending}
                          onChange={() =>
                            toggle(collection.id, collection.hasAnime)
                          }
                        />
                        {collection.thumbnail ? (
                          <img
                            width={72}
                            height={72}
                            src={collection.thumbnail}
                            alt=""
                            className="h-16 w-16 shrink-0 rounded-md object-cover"
                          />
                        ) : (
                          <div className="h-16 w-16 shrink-0 rounded-md bg-muted" />
                        )}
                        <span className="flex min-w-0 flex-col pr-10">
                          <span
                            className={`break-words text-base font-medium ${
                              change === undefined
                                ? ""
                                : "text-blue-500 dark:text-blue-400"
                            } ${pending ? "text-muted-foreground" : ""}`}
                          >
                            {collection.name}
                            {change !== undefined && (
                              <span className="ml-2 text-sm text-muted-foreground">
                                (will {change ? "add to" : "remove from"}{" "}
                                collection)
                              </span>
                            )}
                          </span>
                          <span className="mt-1 text-sm text-muted-foreground">
                            {collection.totalItems}{" "}
                            {collection.totalItems === 1 ? "title" : "titles"}
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
              <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-9 bg-gradient-to-t from-foreground/5 to-transparent" />
            </div>
          )}
          {hasNextPage && (
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => void load(pages + 1)}
            >
              {loading ? "Loading…" : "Show more collections"}
            </Button>
          )}
          {loading && !collections.length && (
            <p className="text-sm text-muted-foreground">
              Loading your collections…
            </p>
          )}
          {error && (
            <p role="alert" className="break-words text-sm text-destructive">
              {error}
            </p>
          )}
          {signedOut && (
            <Link
              className="text-sm underline"
              to="/sign-in"
              search={{ redirect: returnPath }}
            >
              Sign in again
            </Link>
          )}
          <p role="status" className="text-sm text-muted-foreground">
            {pending ? "Saving changes…" : status}
          </p>
        </div>
        <div className="flex w-full flex-row items-center justify-end gap-2">
          {changes.size > 0 ? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="default"
                disabled={pending}
                onClick={() => setChanges(new Map())}
              >
                <Cross2Icon className="mr-2 h-4 w-4" />
                Cancel Changes
              </Button>
              <Button
                type="button"
                size="default"
                fullWidth
                disabled={pending || signedOut}
                onClick={() => void save()}
              >
                {pending ? "Saving…" : `Save Changes (${changes.size})`}
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="default"
              onClick={close}
            >
              Close
            </Button>
          )}
        </div>
      </dialog>
    </>
  );
}
