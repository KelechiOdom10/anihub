import { useRef, useState } from "react";
import { toast } from "sonner";
import { createCollection } from "../server/library";
import { Button } from "./ui/button";

export function CollectionForm({
  animeId,
  cancelLabel,
  onCancel,
  onCreated,
  onBusyChange,
}: {
  animeId?: number;
  cancelLabel: string;
  onCancel: () => void;
  onCreated: () => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const nameInput = useRef<HTMLInputElement>(null);
  const inFlight = useRef(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pending, setPending] = useState(false);
  const [signedOut, setSignedOut] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (inFlight.current) return;

    if (!name.trim()) {
      toast.error("Enter a name");
      nameInput.current?.focus();

      return;
    }

    inFlight.current = true;
    setPending(true);
    onBusyChange(true);

    try {
      const result = await createCollection({
        data: { name, description, animeId },
      });

      if (result.kind !== "created") {
        toast.error(result.message);
        setSignedOut(result.kind === "signed-out");

        return;
      }

      setName("");
      setDescription("");
      toast.success(
        animeId
          ? "Collection created and anime added!"
          : "Collection created successfully!"
      );
      onCreated();
    } catch {
      toast.error("Couldn't confirm save");
    } finally {
      inFlight.current = false;
      setPending(false);
      onBusyChange(false);
    }
  };

  return (
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
            Description
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
        {signedOut && (
          <a
            className="text-sm underline"
            href={`/sign-in?redirect=${encodeURIComponent(animeId ? `/anime/${animeId}` : "/collections")}`}
          >
            Sign in again
          </a>
        )}
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={onCancel}
        >
          {cancelLabel}
        </Button>
        <Button type="submit" disabled={pending || signedOut}>
          {pending
            ? "Creating…"
            : animeId
              ? "Create & Add"
              : "Create Collection"}
        </Button>
      </div>
    </form>
  );
}
