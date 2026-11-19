import { ReloadIcon, StarFilledIcon } from "@radix-ui/react-icons";
import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { formatTimeToNow } from "../lib/date";
import {
  deleteReview,
  getReviews,
  getReviewViewer,
  type Review,
} from "../server/reviews";
import { ReviewForm, type ReviewDraft } from "./review-form";
import { Button } from "./ui/button";

export function AnimeReviews({ animeId }: { animeId: number }) {
  const [page, setPage] = useState(1);
  const [version, setVersion] = useState(0);

  const [data, setData] = useState<Awaited<
    ReturnType<typeof getReviews>
  > | null>(null);

  const [viewer, setViewer] =
    useState<Awaited<ReturnType<typeof getReviewViewer>>>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editor, setEditor] = useState<{ review: Review | null } | null>(null);
  const [drafts, setDrafts] = useState(new Map<string, ReviewDraft>());
  const draftOwner = useRef<string | null>(null);
  const writeTrigger = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const focusAfterRefresh = useRef(false);
  const trigger = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    let active = true;

    setLoading(true);
    setViewer(null);
    setError("");
    Promise.all([getReviews({ data: { animeId, page } }), getReviewViewer()])
      .then(([reviews, user]) => {
        if (!active) return;

        setData(reviews);
        setViewer(user);

        if (draftOwner.current !== (user?.id ?? null)) {
          setDrafts(new Map());
          setEditor(null);
          draftOwner.current = user?.id ?? null;
        }
      })
      .catch(() => {
        if (active) {
          setError("Couldn't load reviews");
          toast.error("Couldn't load reviews");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const hide = () => {
      active = false;
      setViewer(null);
      setEditor(null);
      setDrafts(new Map());
    };

    const show = (event: PageTransitionEvent) => {
      if (event.persisted) setVersion((value) => value + 1);
    };

    window.addEventListener("pagehide", hide);
    window.addEventListener("pageshow", show);

    return () => {
      active = false;
      window.removeEventListener("pagehide", hide);
      window.removeEventListener("pageshow", show);
    };
  }, [animeId, page, version]);

  useEffect(() => {
    if (loading || !focusAfterRefresh.current) return;

    focusAfterRefresh.current = false;
    (writeTrigger.current ?? heading.current)?.focus();
  }, [loading]);

  const refresh = () => setVersion((value) => value + 1);

  const close = () => {
    setEditor(null);
    trigger.current?.focus();
  };

  return (
    <section className="max-w-3xl space-y-6" aria-label="Anime reviews">
      <div className="flex items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-1">
          <h2
            ref={heading}
            tabIndex={-1}
            className="text-xl font-bold focus-visible:outline focus-visible:outline-ring"
          >
            Comments
          </h2>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Refresh reviews"
            className="h-8 w-8 text-muted-foreground"
            disabled={loading}
            onClick={refresh}
          >
            <ReloadIcon className="h-4 w-4" />
          </Button>
        </div>
        {viewer ? (
          <Button
            ref={writeTrigger}
            size="default"
            onClick={(event) => {
              trigger.current = event.currentTarget;
              setEditor({ review: null });
            }}
          >
            Write a Review
          </Button>
        ) : !loading && !error ? (
          <Button asChild size="default">
            <Link
              to="/sign-in"
              search={{ redirect: `/anime/${animeId}?tab=reviews` }}
            >
              Login to Get Started
            </Link>
          </Button>
        ) : null}
      </div>
      {editor && (
        <ReviewForm
          animeId={animeId}
          review={editor.review}
          draft={
            drafts.get(editor.review?.id ?? "new") ?? {
              text: editor.review?.text ?? "",
              rating: editor.review?.rating ?? 0,
              isSpoiler: editor.review?.isSpoiler ?? false,
            }
          }
          onChange={(draft) =>
            setDrafts((current) =>
              new Map(current).set(editor.review?.id ?? "new", draft)
            )
          }
          onClose={close}
          onSaved={() => {
            setDrafts((current) => {
              const next = new Map(current);

              next.delete(editor.review?.id ?? "new");

              return next;
            });
            close();
            focusAfterRefresh.current = true;
            setPage(1);
            refresh();
          }}
        />
      )}
      <div>
        {loading ? (
          <p
            role="status"
            className="animate-pulse text-muted-foreground motion-reduce:animate-none"
          >
            Loading comments…
          </p>
        ) : error ? (
          <div className="space-y-3">
            <Button variant="secondary" size="default" onClick={refresh}>
              Retry reviews
            </Button>
          </div>
        ) : data?.reviews.length ? (
          <>
            {data.reviews.map((review) => (
              <ReviewRow
                key={`${review.id}:${review.updatedAt}`}
                review={review}
                owned={viewer?.id === review.author.id}
                onEdit={(button) => {
                  trigger.current = button;
                  setEditor({ review });
                }}
                onDeleted={() => {
                  focusAfterRefresh.current = true;
                  setPage(1);
                  refresh();
                }}
              />
            ))}
            <div className="flex flex-wrap gap-3 pt-4">
              {page > 1 && (
                <Button
                  variant="secondary"
                  size="default"
                  onClick={() => setPage(page - 1)}
                >
                  Previous reviews
                </Button>
              )}
              {data.hasNextPage && (
                <Button
                  variant="secondary"
                  size="default"
                  onClick={() => setPage(page + 1)}
                >
                  More reviews
                </Button>
              )}
            </div>
          </>
        ) : (
          <p className="rounded-lg border border-dashed border-zinc-800 px-6 py-12 text-center text-sm text-muted-foreground">
            No comments yet. Be the first to share your thoughts!
          </p>
        )}
      </div>
    </section>
  );
}

const action =
  "rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

function ReviewRow({
  review,
  owned,
  onEdit,
  onDeleted,
}: {
  review: Review;
  owned: boolean;
  onEdit: (button: HTMLButtonElement) => void;
  onDeleted: () => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const inFlight = useRef(false);

  const remove = async () => {
    if (inFlight.current) return;

    inFlight.current = true;
    setPending(true);

    try {
      const result = await deleteReview({ data: { id: review.id } });

      if (result.kind === "saved") {
        onDeleted();
        toast.success("Review deleted");
      } else toast.error(result.message);
    } catch {
      toast.error("Couldn't confirm deletion");
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  };

  return (
    <article
      className="flex gap-3 border-b border-zinc-800 py-4 first:pt-0 last:border-b-0 sm:gap-4"
      data-review-id={review.id}
    >
      <img
        src={review.author.avatar ?? "/anime-male-avatar.avif"}
        alt=""
        className="mt-0.5 h-9 w-9 shrink-0 rounded-full object-cover sm:h-10 sm:w-10"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span
            role="img"
            className="flex gap-0.5"
            aria-label={`${review.rating} out of 5 stars`}
          >
            {Array.from({ length: review.rating }, (_, index) => (
              <StarFilledIcon
                key={index}
                aria-hidden="true"
                className="h-3.5 w-3.5 text-yellow-500"
              />
            ))}
          </span>
          <span className="break-words font-semibold [overflow-wrap:anywhere]">
            {review.author.name}
          </span>
          <time
            className="text-muted-foreground"
            dateTime={new Date(review.createdAt).toISOString()}
          >
            {formatTimeToNow(review.createdAt)}
          </time>
        </div>
        {review.isSpoiler && !owned && !revealed ? (
          <p className="mt-1.5 text-sm italic text-muted-foreground">
            This review may contain spoilers.{" "}
            <button
              type="button"
              className="font-semibold not-italic text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => setRevealed(true)}
            >
              Show anyway
            </button>
          </p>
        ) : (
          <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-zinc-300 [overflow-wrap:anywhere]">
            {review.text}
          </p>
        )}
        {owned && (
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {confirming ? (
              <>
                <span className="text-foreground">Delete this review?</span>
                <button
                  type="button"
                  disabled={pending}
                  onClick={remove}
                  className={`${action} text-red-400 hover:text-red-300`}
                >
                  {pending ? "Deleting…" : "Delete"}
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setConfirming(false)}
                  className={action}
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={(event) => onEdit(event.currentTarget)}
                  className={action}
                >
                  Edit<span className="sr-only"> review</span>
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(true)}
                  className={action}
                >
                  Delete<span className="sr-only"> review</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
