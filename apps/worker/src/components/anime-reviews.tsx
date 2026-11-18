import { ReloadIcon, StarIcon } from "@radix-ui/react-icons";
import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  deleteReview,
  getReviews,
  getReviewViewer,
  type Review,
} from "../server/reviews";
import { ReviewForm, type ReviewDraft } from "./review-form";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader } from "./ui/card";

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
        if (active) setError("Couldn't load reviews. Please try again.");
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
              publishPublicly: false,
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
      <div className="space-y-4">
        {loading ? (
          <p
            role="status"
            className="animate-pulse text-muted-foreground motion-reduce:animate-none"
          >
            Loading comments…
          </p>
        ) : error ? (
          <div className="space-y-4 rounded-lg border border-dashed border-zinc-800 px-6 py-10 text-center">
            <p role="alert" className="text-sm">
              {error}
            </p>
            <Button variant="secondary" size="default" onClick={refresh}>
              Retry reviews
            </Button>
          </div>
        ) : data?.reviews.length ? (
          <>
            {data.reviews.map((review) => (
              <ReviewCard
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
            <div className="flex flex-wrap gap-3">
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

function ReviewCard({
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
  const [error, setError] = useState("");
  const inFlight = useRef(false);

  const remove = async () => {
    if (inFlight.current) return;

    inFlight.current = true;
    setPending(true);
    setError("");

    try {
      const result = await deleteReview({ data: { id: review.id } });

      if (result.kind === "saved") onDeleted();
      else setError(result.message);
    } catch {
      setError(
        "Couldn't confirm deletion. Reload the reviews before retrying."
      );
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  };

  return (
    <Card className="overflow-hidden" data-review-id={review.id}>
      <CardHeader className="space-y-3 pb-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <img
              src="/anime-male-avatar.avif"
              alt=""
              className="h-8 w-8 shrink-0 rounded-full"
            />
            <div className="min-w-0">
              <p className="break-words text-sm font-medium">
                {review.author.name}
              </p>
              <time
                className="text-xs text-muted-foreground"
                dateTime={new Date(review.createdAt).toISOString()}
              >
                {new Date(review.createdAt).toLocaleDateString("en-GB", {
                  dateStyle: "medium",
                  timeZone: "UTC",
                })}
              </time>
            </div>
          </div>
          <div
            className="flex shrink-0 gap-0.5"
            aria-label={`${review.rating} out of 5 stars`}
          >
            {Array.from({ length: review.rating }, (_, index) => (
              <StarIcon
                key={index}
                aria-hidden="true"
                className="h-4 w-4 fill-yellow-500 text-yellow-500"
              />
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {review.isSpoiler && !revealed ? (
          <div className="relative min-h-20">
            <p
              aria-hidden="true"
              className="select-none whitespace-pre-wrap break-words text-sm leading-relaxed blur-md [overflow-wrap:anywhere]"
            >
              {review.text}
            </p>
            <Button
              variant="ghost"
              className="absolute inset-0 h-full w-full whitespace-normal text-sm font-medium backdrop-blur-md hover:bg-transparent"
              onClick={() => setRevealed(true)}
              aria-expanded={false}
            >
              This comment contains spoilers.
              <br />
              Click to reveal.
            </Button>
          </div>
        ) : (
          <>
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed [overflow-wrap:anywhere]">
              {review.text}
            </p>
            {review.isSpoiler && (
              <Button
                size="sm"
                variant="ghost"
                aria-expanded={true}
                onClick={() => setRevealed(false)}
              >
                Hide spoilers
              </Button>
            )}
          </>
        )}
        {owned && (
          <div className="flex flex-wrap gap-2">
            {confirming ? (
              <>
                <p className="w-full text-sm">
                  Delete this review? This can't be undone.
                </p>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={pending}
                  onClick={remove}
                >
                  {pending ? "Deleting…" : "Confirm delete"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => setConfirming(false)}
                >
                  Cancel deletion
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(event) => onEdit(event.currentTarget)}
                >
                  Edit review
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setConfirming(true)}
                >
                  Delete review
                </Button>
              </>
            )}
          </div>
        )}
        {error && (
          <p role="alert" className="break-words text-sm text-destructive">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
