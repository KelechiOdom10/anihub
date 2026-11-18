import { useRef, useState } from "react";
import { toast } from "sonner";
import { setCollectionVisibility } from "../server/library";

export function CollectionVisibilitySwitch({
  collectionId,
  isPublic,
}: {
  collectionId: string;
  isPublic: boolean;
}) {
  const [checked, setChecked] = useState(isPublic);
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);

  const toggle = async () => {
    if (inFlight.current) return;

    const next = !checked;

    inFlight.current = true;
    setChecked(next);
    setPending(true);

    try {
      const result = await setCollectionVisibility({
        data: { id: collectionId, isPublic: next },
      });

      if (result.kind === "saved") {
        toast.success(
          next ? "Collection is now public" : "Collection is now private"
        );

        return;
      }

      setChecked(!next);
      toast.error(result.message);
    } catch {
      setChecked(!next);
      toast.error("Couldn't change this collection's visibility. Try again.");
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  };

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label="Make this collection public"
        disabled={pending}
        onClick={toggle}
        className={`inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${checked ? "bg-primary" : "bg-input"}`}
      >
        <span
          aria-hidden="true"
          className={`pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform motion-reduce:transition-none ${checked ? "translate-x-5" : "translate-x-0"}`}
        />
      </button>
      {checked ? "Public collection" : "Private collection"}
    </div>
  );
}
