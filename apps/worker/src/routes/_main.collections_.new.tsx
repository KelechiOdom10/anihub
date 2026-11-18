import {
  createFileRoute,
  Link,
  redirect,
  useNavigate,
} from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { CollectionAnimePicker } from "../components/collection-anime-picker";
import { Button } from "../components/ui/button";
import type { Anime } from "../server/anime";
import { createCollection } from "../server/library";

export const Route = createFileRoute("/_main/collections_/new")({
  beforeLoad: ({ context }) => {
    if (!context.viewer)
      throw redirect({
        to: "/sign-in",
        search: { redirect: "/collections/new" },
      });
  },
  head: () => ({ meta: [{ title: "Create Collection | Anihub" }] }),
  component: NewCollection,
});

function NewCollection() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [selected, setSelected] = useState(new Map<number, Anime>());
  const [pending, setPending] = useState(false);
  const navigate = useNavigate();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (pending) return;

    setPending(true);

    try {
      const result = await createCollection({
        data: {
          name,
          description,
          isPublic,
          animeIds: [...selected.keys()],
        },
      });

      if (result.kind === "created") {
        toast.success("Collection created successfully!");
        await navigate({ to: "/collections", search: { page: 1 } });

        return;
      }

      toast.error("Failed to create collection", {
        description: result.message,
      });
    } catch {
      toast.error("Failed to create collection", {
        description: "Check My Collections before trying again.",
      });
    } finally {
      setPending(false);
    }
  };

  return (
    <section className="container mt-28 max-w-3xl space-y-8 px-4 py-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Create New Collection</h1>
        <p className="text-sm text-muted-foreground">
          Organize your favorite anime. New collections are private.
        </p>
      </div>
      <form onSubmit={submit} aria-busy={pending} className="space-y-6">
        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor="collection-name">
            Name
          </label>
          <input
            id="collection-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="My Favorite Anime"
            required
            maxLength={100}
            readOnly={pending}
            className="flex h-11 w-full rounded-lg border-[1.3px] border-white/30 bg-zinc-800 bg-opacity-50 px-3 py-1.5 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
        <div className="grid gap-2">
          <label
            className="text-sm font-medium"
            htmlFor="collection-description"
          >
            Description{" "}
            <span className="text-muted-foreground">(optional)</span>
          </label>
          <textarea
            id="collection-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="A collection of my favorite anime series..."
            maxLength={500}
            readOnly={pending}
            className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <p className="text-xs text-muted-foreground">
            {description.length} / 500 characters
          </p>
        </div>
        <div className="flex items-start gap-2">
          <button
            type="button"
            role="switch"
            id="collection-public"
            aria-checked={isPublic}
            aria-describedby="collection-public-help"
            disabled={pending}
            onClick={() => setIsPublic(!isPublic)}
            className={`mt-0.5 inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${isPublic ? "bg-primary" : "bg-input"}`}
          >
            <span
              aria-hidden="true"
              className={`pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform motion-reduce:transition-none ${isPublic ? "translate-x-5" : "translate-x-0"}`}
            />
          </button>
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="collection-public">
              Make this collection public
            </label>
            <p
              id="collection-public-help"
              className="text-sm text-muted-foreground"
            >
              Public collections can be viewed by anyone
            </p>
          </div>
        </div>
        <CollectionAnimePicker selected={selected} onChange={setSelected} />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
          <Button type="button" variant="ghost" size="default" asChild>
            <Link to="/collections" search={{ page: 1 }}>
              Cancel
            </Link>
          </Button>
          <Button type="submit" size="default" disabled={pending}>
            {pending ? "Creating…" : "Create Collection"}
          </Button>
        </div>
      </form>
    </section>
  );
}
