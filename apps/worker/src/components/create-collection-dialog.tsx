import { PlusIcon } from "@radix-ui/react-icons";
import { Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { createCollection } from "../server/library";
import { Button } from "./ui/button";

export function CreateCollectionDialog({
  animeId,
  signedIn,
}: {
  animeId?: number;
  signedIn: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const inFlight = useRef(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [signedOut, setSignedOut] = useState(false);
  const navigate = useNavigate();
  const returnPath = animeId ? `/anime/${animeId}` : "/collections";

  if (!signedIn)
    return (
      <Button variant="secondary" asChild>
        <Link to="/sign-in" search={{ redirect: returnPath }}>
          <PlusIcon className="mr-2 h-4 w-4" />
          Create collection
        </Link>
      </Button>
    );

  const close = () => {
    if (inFlight.current) return;

    dialog.current?.close();
    trigger.current?.focus();
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (inFlight.current) return;

    if (!name.trim()) {
      setError("Name is required.");
      nameInput.current?.focus();

      return;
    }

    inFlight.current = true;
    setPending(true);
    setError("");

    try {
      const result = await createCollection({
        data: { name, description, animeId },
      });

      if (result.kind !== "created") {
        setError(result.message);
        setSignedOut(result.kind === "signed-out");

        return;
      }

      dialog.current?.close();
      setName("");
      setDescription("");
      await navigate({
        to: "/collections",
        search: { page: 1 },
        reloadDocument: true,
      });
    } catch {
      setError(
        "Couldn't confirm the save. Check My Collections before retrying. Your draft is still here."
      );
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  };

  return (
    <>
      <Button
        ref={trigger}
        variant="secondary"
        onClick={() => {
          dialog.current?.showModal();
          nameInput.current?.focus();
        }}
      >
        <PlusIcon className="mr-2 h-4 w-4" />
        Create collection
      </Button>
      <dialog
        ref={dialog}
        aria-labelledby="collection-title"
        aria-describedby="collection-description"
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        onClose={() => trigger.current?.focus()}
        onKeyDown={(event) => {
          if (event.key !== "Tab") return;

          const controls = event.currentTarget.querySelectorAll<HTMLElement>(
            "input, textarea, button:not([disabled]), a[href]"
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
          id="collection-title"
          className="text-center text-lg font-semibold leading-none tracking-tight sm:text-left"
        >
          Create New Collection
        </h2>
        <p
          id="collection-description"
          className="mt-2 text-center text-sm text-muted-foreground sm:text-left"
        >
          Organize your favorite anime. New collections are private.
        </p>
        <form onSubmit={submit} aria-busy={pending}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="collection-name">
                Name
              </label>
              <input
                ref={nameInput}
                id="collection-name"
                className="flex h-11 w-full rounded-lg border-[1.3px] border-white/30 bg-zinc-800 bg-opacity-50 px-3 py-1.5 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="My Favorite Anime"
                required
                maxLength={100}
                readOnly={pending}
              />
            </div>
            <div className="grid gap-2">
              <label
                className="text-sm font-medium"
                htmlFor="collection-description-input"
              >
                Description{" "}
                <span className="text-muted-foreground">(optional)</span>
              </label>
              <textarea
                id="collection-description-input"
                className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="A collection of my favorite anime series..."
                maxLength={500}
                readOnly={pending}
              />
            </div>
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
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={close}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending || signedOut}>
              {pending
                ? "Creating…"
                : animeId
                  ? "Create & Add"
                  : "Create Collection"}
            </Button>
          </div>
          <p className="sr-only" role="status">
            {pending ? "Saving collection. Please wait." : ""}
          </p>
        </form>
      </dialog>
    </>
  );
}
