import { Cross2Icon } from "@radix-ui/react-icons";
import { Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { CollectionForm } from "./collection-form";
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
  const [pending, setPending] = useState(false);
  const navigate = useNavigate();

  if (!signedIn)
    return (
      <Button variant="secondary" size="default" asChild>
        <Link
          to="/sign-in"
          search={{ redirect: animeId ? `/anime/${animeId}` : "/collections" }}
        >
          + Create New
        </Link>
      </Button>
    );

  const close = () => {
    if (pending) return;

    dialog.current?.close();
    trigger.current?.focus();
  };

  return (
    <>
      <Button
        ref={trigger}
        variant="secondary"
        size="default"
        onClick={() => {
          dialog.current?.showModal();
          dialog.current?.querySelector("input")?.focus();
        }}
      >
        + Create New
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

          const controls = [
            ...event.currentTarget.querySelectorAll<HTMLElement>(
              "input, textarea, button:not([disabled]), a[href]"
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
          id="collection-title"
          className="text-center text-lg font-semibold leading-none tracking-tight sm:text-left"
        >
          Create New Collection
        </h2>
        <p
          id="collection-description"
          className="mt-2 text-center text-sm text-muted-foreground sm:text-left"
        >
          Create a collection to organize your favorite anime.
        </p>
        <CollectionForm
          animeId={animeId}
          cancelLabel="Cancel"
          onCancel={close}
          onBusyChange={setPending}
          onCreated={() => {
            dialog.current?.close();
            void navigate({ to: "/collections", search: { page: 1 } });
          }}
        />
        <button
          type="button"
          onClick={close}
          disabled={pending}
          className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none"
        >
          <Cross2Icon className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
      </dialog>
    </>
  );
}
