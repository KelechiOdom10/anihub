import {
  createFileRoute,
  Link,
  notFound,
  useRouter,
} from "@tanstack/react-router";
import { useState } from "react";
import { StarIcon } from "@radix-ui/react-icons";
import { z } from "zod";
import { PageMessage } from "../components/page-message";
import { Button } from "../components/ui/button";
import { InfoCard } from "../components/ui/info-card";
import { getPublicCollections } from "../server/library";
import { getProfileReviews } from "../server/profile";

export const Route = createFileRoute("/_main/users_/$userId")({
  validateSearch: z.object({
    page: z.coerce.number().int().min(1).max(1000).default(1).catch(1),
    reviews: z.coerce.number().int().min(1).max(1000).default(1).catch(1),
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ params, deps }) => {
    const [collections, reviews] = await Promise.all([
      getPublicCollections({
        data: { userId: params.userId, page: deps.page },
      }),
      getProfileReviews({
        data: { userId: params.userId, page: deps.reviews },
      }),
    ]);

    if (!collections || !reviews) throw notFound();

    return { collections, reviews };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [{ title: `${loaderData.collections.owner.name} | Anihub` }]
      : [],
  }),
  component: PublicProfile,
  notFoundComponent: () => (
    <PageMessage heading="User not found" body="This profile doesn't exist." />
  ),
  errorComponent: PublicProfileError,
});

function PublicProfile() {
  const { collections, reviews } = Route.useLoaderData();
  const { owner } = collections;
  const search = Route.useSearch();

  return (
    <section className="container mt-28 max-w-5xl space-y-10 px-4 py-8">
      <div className="flex items-center gap-3">
        <img
          src={owner.avatar}
          alt=""
          width={48}
          height={48}
          className="h-12 w-12 rounded-full object-cover"
        />
        <div className="min-w-0">
          <h1 className="break-words text-2xl font-semibold">{owner.name}</h1>
          <p className="text-sm text-muted-foreground">Public collections</p>
        </div>
      </div>
      {collections.collections.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-800 px-6 py-12 text-center text-sm text-muted-foreground">
          No public collections yet.
        </p>
      ) : (
        <div className="grid items-start gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {collections.collections.map((collection) => {
            const images = collection.items.map((item) => ({
              url: item.image,
              alt: item.title,
            }));

            while (images.length < 3)
              images.push({
                url: "/fallback-anime.avif",
                alt: collection.name,
              });

            return (
              <Link
                key={collection.id}
                to="/collections/$collectionId"
                params={{ collectionId: collection.id }}
                className="block space-y-2 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
              >
                <div className="[&>div]:!h-full [&>div]:!transform-none [&_*]:!animate-none [&_*]:!transition-none">
                  <InfoCard heading={collection.name} images={images} />
                </div>
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {collection.description ??
                    `${collection.items.length} titles`}
                </p>
              </Link>
            );
          })}
        </div>
      )}
      <nav aria-label="Collection pages" className="flex gap-4">
        {search.page > 1 && (
          <Button asChild variant="secondary" size="default">
            <Link
              to="/users/$userId"
              params={{ userId: owner.id }}
              search={{ ...search, page: search.page - 1 }}
            >
              Previous collections
            </Link>
          </Button>
        )}
        {collections.hasNextPage && (
          <Button asChild variant="secondary" size="default">
            <Link
              to="/users/$userId"
              params={{ userId: owner.id }}
              search={{ ...search, page: search.page + 1 }}
            >
              More collections
            </Link>
          </Button>
        )}
      </nav>
      <div className="space-y-4">
        <h2 className="border-b border-zinc-800 pb-3 text-xl font-bold">
          Reviews
        </h2>
        {reviews.reviews.length === 0 ? (
          <p className="rounded-lg border border-dashed border-zinc-800 px-6 py-12 text-center text-sm text-muted-foreground">
            No reviews yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {reviews.reviews.map((review) => (
              <ProfileReview key={review.id} review={review} />
            ))}
          </ul>
        )}
        <nav aria-label="Review pages" className="flex gap-4">
          {search.reviews > 1 && (
            <Button asChild variant="secondary" size="default">
              <Link
                to="/users/$userId"
                params={{ userId: owner.id }}
                search={{ ...search, reviews: search.reviews - 1 }}
              >
                Previous reviews
              </Link>
            </Button>
          )}
          {reviews.hasNextPage && (
            <Button asChild variant="secondary" size="default">
              <Link
                to="/users/$userId"
                params={{ userId: owner.id }}
                search={{ ...search, reviews: search.reviews + 1 }}
              >
                More reviews
              </Link>
            </Button>
          )}
        </nav>
      </div>
    </section>
  );
}

function ProfileReview({
  review,
}: {
  review: NonNullable<
    Awaited<ReturnType<typeof getProfileReviews>>
  >["reviews"][number];
}) {
  const { viewer } = Route.useRouteContext();
  const { owner } = Route.useLoaderData().collections;
  const [revealed, setRevealed] = useState(false);

  const masked = review.isSpoiler && !revealed && viewer?.id !== owner.id;

  const date = new Date(review.createdAt).toLocaleDateString("en-GB", {
    dateStyle: "medium",
    timeZone: "UTC",
  });

  return (
    <li className="flex min-w-0 gap-3 rounded-lg border border-border p-3">
      {review.anime ? (
        <Link
          to="/anime/$id"
          params={{ id: String(review.anime.id) }}
          className="shrink-0"
        >
          <img
            src={review.anime.image}
            alt=""
            loading="lazy"
            width={56}
            height={84}
            className="h-21 w-14 rounded object-cover"
          />
        </Link>
      ) : (
        <img
          src="/fallback-anime.avif"
          alt=""
          loading="lazy"
          width={56}
          height={84}
          className="h-21 w-14 shrink-0 rounded object-cover"
        />
      )}
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {review.anime ? (
            <Link
              to="/anime/$id"
              params={{ id: String(review.anime.id) }}
              className="text-sm font-semibold underline-offset-4 hover:underline"
            >
              {review.anime.title}
            </Link>
          ) : (
            <span className="text-sm text-muted-foreground">
              Anime unavailable
            </span>
          )}
          <span
            className="flex gap-0.5"
            aria-label={`${review.rating} out of 5 stars`}
          >
            {Array.from({ length: review.rating }, (_, index) => (
              <StarIcon
                key={index}
                aria-hidden="true"
                className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500"
              />
            ))}
          </span>
          <time
            className="text-xs text-muted-foreground"
            dateTime={new Date(review.createdAt).toISOString()}
          >
            {date}
          </time>
        </div>
        {masked ? (
          <Button
            variant="ghost"
            size="sm"
            className="whitespace-normal text-left text-sm"
            aria-expanded={false}
            onClick={() => setRevealed(true)}
          >
            This review contains spoilers. Click to reveal.
          </Button>
        ) : (
          <p className="line-clamp-4 whitespace-pre-wrap break-words text-sm leading-relaxed [overflow-wrap:anywhere]">
            {review.text}
          </p>
        )}
      </div>
    </li>
  );
}

function PublicProfileError() {
  const router = useRouter();

  return (
    <PageMessage
      heading="Couldn't load this profile"
      body="Nothing has changed. Please try again."
      onRetry={() => router.invalidate()}
    />
  );
}
