import { Cross2Icon, StarIcon } from "@radix-ui/react-icons";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { createReview, editReview, type Review } from "../server/reviews";
import { Button } from "./ui/button";

export type ReviewDraft = {
  text: string;
  rating: number;
  isSpoiler: boolean;
};

export function ReviewForm({
  animeId,
  review,
  draft,
  onChange,
  onClose,
  onSaved,
}: {
  animeId: number;
  review: Review | null;
  draft: ReviewDraft;
  onChange: (draft: ReviewDraft) => void;
  onClose: () => void;
  onSaved: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const firstStar = useRef<HTMLInputElement>(null);
  const inFlight = useRef(false);
  const { text, rating, isSpoiler } = draft;
  const [pending, setPending] = useState(false);

  useEffect(() => {
    dialog.current?.showModal();
    firstStar.current?.focus();
  }, []);

  const close = () => {
    dialog.current?.close();
    onClose();
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (inFlight.current) return;

    if (!rating || !text.trim() || text.length > 5000) {
      toast.error(
        !rating
          ? "Rating is required"
          : !text.trim()
            ? "Comment is required"
            : "Comments can be up to 5,000 characters"
      );

      return;
    }

    inFlight.current = true;
    setPending(true);

    try {
      const content = {
        text,
        rating,
        isSpoiler,
      };

      const result = review
        ? await editReview({ data: { id: review.id, ...content } })
        : await createReview({ data: { animeId, ...content } });

      if (result.kind !== "saved") {
        toast.error(result.message);

        return;
      }

      dialog.current?.close();
      onSaved();
      toast.success(review ? "Review updated" : "Comment posted successfully!");
    } catch {
      toast.error("Couldn't confirm save");
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  };

  return (
    <dialog
      ref={dialog}
      aria-labelledby="review-form-title"
      onCancel={(event) => {
        event.preventDefault();

        if (!inFlight.current) close();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;

        const controls = event.currentTarget.querySelectorAll<HTMLElement>(
          'input:not([type="radio"]), input[type="radio"]:checked, textarea, button:not([disabled])'
        );

        const first = rating ? controls[0] : firstStar.current;
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
        id="review-form-title"
        className="text-center text-lg font-semibold leading-none tracking-tight sm:text-left"
      >
        {review ? "Edit Review" : "Write a Review"}
      </h2>
      <form onSubmit={submit} className="mt-4 space-y-4" aria-busy={pending}>
        <fieldset disabled={pending}>
          <legend className="mb-2 text-sm font-medium">Rating</legend>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((value) => (
              <label
                key={value}
                className="relative cursor-pointer rounded-md p-1 hover:bg-accent"
              >
                <input
                  ref={value === 1 ? firstStar : undefined}
                  type="radio"
                  name="rating"
                  value={value}
                  aria-label={`Rate ${value} stars`}
                  checked={rating === value}
                  onChange={() => onChange({ ...draft, rating: value })}
                  className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                />
                <StarIcon
                  className={`h-5 w-5 rounded-sm peer-focus-visible:ring-2 peer-focus-visible:ring-ring ${rating >= value ? "text-yellow-500" : "text-muted-foreground"}`}
                />
              </label>
            ))}
          </div>
        </fieldset>
        <div className="space-y-2">
          <label htmlFor="review-text" className="text-sm font-medium">
            Your Comment
          </label>
          <textarea
            id="review-text"
            value={text}
            onChange={(event) =>
              onChange({ ...draft, text: event.target.value })
            }
            readOnly={pending}
            maxLength={5000}
            aria-describedby="review-character-count"
            placeholder="Share your thoughts about this anime..."
            className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
          <p
            id="review-character-count"
            className="text-xs text-muted-foreground"
          >
            {text.length.toLocaleString()} / 5,000 characters
          </p>
        </div>
        <label
          className="flex items-center gap-2 text-sm"
          htmlFor="review-spoiler"
        >
          <button
            id="review-spoiler"
            type="button"
            role="switch"
            aria-checked={isSpoiler}
            onClick={() => onChange({ ...draft, isSpoiler: !isSpoiler })}
            disabled={pending}
            className={`inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 ${isSpoiler ? "bg-primary" : "bg-input"}`}
          >
            <span
              aria-hidden="true"
              className={`pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform motion-reduce:transition-none ${isSpoiler ? "translate-x-5" : "translate-x-0"}`}
            />
          </button>
          This comment contains spoilers
        </label>
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Publishing…" : review ? "Save Review" : "Post Comment"}
        </Button>
      </form>
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
  );
}
