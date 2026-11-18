import { Cross2Icon, ListBulletIcon, PlusIcon } from "@radix-ui/react-icons";
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { getMembership, setMembership } from "../server/library";
import { CollectionForm } from "./collection-form";
import { Button } from "./ui/button";

type Membership = NonNullable<Awaited<ReturnType<typeof getMembership>>>;

export function ChooseCollectionDialog({
  animeId,
  viewer,
}: {
  animeId: number;
  viewer: { name: string } | null;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const inFlight = useRef(false);
  const generation = useRef(0);
  const [collections, setCollections] = useState<Membership["collections"]>([]);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [pages, setPages] = useState(0);
  const [changes, setChanges] = useState<Map<string, boolean>>(new Map());
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const [signedOut, setSignedOut] = useState(false);
  const [creating, setCreating] = useState(false);
  const [creatingBusy, setCreatingBusy] = useState(false);
  const [draftVersion, setDraftVersion] = useState(0);
  const createTrigger = useRef<HTMLButtonElement>(null);
  const returnPath = `/anime/${animeId}`;
  const navigate = useNavigate();

  useEffect(() => {
    const clear = () => {
      generation.current++;
      dialog.current?.close();
      setCollections([]);
      setChanges(new Map());
      setPages(0);
      setCreating(false);
      setDraftVersion((version) => version + 1);
    };

    clear();
    window.addEventListener("pagehide", clear);

    return () => window.removeEventListener("pagehide", clear);
  }, [viewer]);

  useEffect(() => {
    if (creating)
      dialog.current?.querySelector<HTMLInputElement>("form input")?.focus();
  }, [creating]);

  if (!viewer)
    return (
      <Button variant="secondary" size="default" asChild>
        <Link to="/sign-in" search={{ redirect: returnPath }}>
          <ListBulletIcon className="mr-2 h-4 w-4" />
          Add to Collection
        </Link>
      </Button>
    );

  const load = async (page: number) => {
    const current = ++generation.current;

    setLoading(true);

    try {
      const result = await getMembership({ data: { animeId, page } });

      if (current !== generation.current) return;

      if (!result) {
        setCollections([]);
        setSignedOut(true);
        toast.error("Sign in again");

        return;
      }

      setCollections((current) =>
        page === 1 ? result.collections : [...current, ...result.collections]
      );
      setHasNextPage(result.hasNextPage);
      setPages(page);
    } catch {
      if (current === generation.current)
        toast.error("Couldn't load collections");
    } finally {
      setLoading(false);
    }
  };

  const open = () => {
    setCreating(false);
    setCollections([]);
    setPages(0);
    setChanges(new Map());
    setSignedOut(false);
    dialog.current?.showModal();
    void load(1);
  };

  const close = () => {
    if (inFlight.current || creatingBusy) return;

    dialog.current?.close();
  };

  const toggle = (id: string, current: boolean) => {
    if (!changes.has(id) && changes.size === 50) {
      toast.error("Choose up to 50 collections");

      return;
    }

    setChanges((previous) => {
      const next = new Map(previous);

      if (next.has(id)) next.delete(id);
      else next.set(id, !current);

      return next;
    });
  };

  const save = async () => {
    if (inFlight.current || !changes.size || changes.size > 50) return;

    inFlight.current = true;
    setPending(true);

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
        toast.error(result.message);
        setSignedOut(result.kind === "signed-out");

        if (result.kind === "signed-out") setCollections([]);

        return;
      }

      setChanges(new Map());
      await load(1);
      toast.success(
        `Updated ${result.changed} collection${result.changed === 1 ? "" : "s"}`
      );
    } catch {
      toast.error("Couldn't confirm save");
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  };

  const busy = pending || loading;

  return (
    <>
      <Button ref={trigger} variant="secondary" size="default" onClick={open}>
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

          const controls = [
            ...event.currentTarget.querySelectorAll<HTMLElement>(
              "input:not([disabled]), textarea, button:not([disabled]), a[href]"
            ),
          ].filter((element) => element.getClientRects().length > 0);

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
          {collections.length
            ? "Select the collections you want this anime to be in."
            : "Create your first collection to start organizing your favorite anime!"}
        </p>
        <div hidden={creating}>
          <div className="grid gap-4 py-4" aria-busy={busy}>
            {collections.length > 0 && (
              <Button
                ref={createTrigger}
                type="button"
                fullWidth
                size="default"
                disabled={busy}
                onClick={() => setCreating(true)}
              >
                <PlusIcon className="mr-2 h-4 w-4" />
                Create New Collection
              </Button>
            )}
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
            {!loading && pages > 0 && !collections.length && (
              <div className="flex flex-col items-center gap-4 py-6">
                <p className="text-center text-muted-foreground">
                  You don't have any collections yet.
                </p>
                <Button
                  ref={createTrigger}
                  type="button"
                  className="w-full"
                  onClick={() => setCreating(true)}
                >
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Create Your First Collection
                </Button>
              </div>
            )}
            {!loading && !pages && !signedOut && (
              <Button variant="outline" onClick={() => void load(1)}>
                Retry
              </Button>
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
          </div>
          <div className="flex w-full flex-row items-center justify-end gap-2">
            {changes.size > 0 ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="default"
                  disabled={pending}
                  onClick={() => {
                    setChanges(new Map());
                    toast.success("Changes cancelled");
                  }}
                >
                  <Cross2Icon className="mr-2 h-4 w-4" />
                  Cancel Changes
                </Button>
                <Button
                  type="button"
                  size="default"
                  fullWidth
                  disabled={pending || signedOut || changes.size > 50}
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
        </div>
        <div hidden={!creating}>
          <CollectionForm
            key={draftVersion}
            animeId={animeId}
            cancelLabel="Back"
            onCancel={() => {
              setCreating(false);
              requestAnimationFrame(() => createTrigger.current?.focus());
            }}
            onBusyChange={setCreatingBusy}
            onCreated={() => {
              setCreating(false);
              dialog.current?.close();
              void navigate({ to: "/collections", search: { page: 1 } });
            }}
          />
        </div>
        <button
          type="button"
          onClick={close}
          disabled={pending || creatingBusy}
          className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none"
        >
          <Cross2Icon className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
      </dialog>
    </>
  );
}
