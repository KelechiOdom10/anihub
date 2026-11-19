import { ChatBubbleIcon, LayersIcon, StarIcon } from "@radix-ui/react-icons";
import {
  createFileRoute,
  Link,
  notFound,
  useRouter,
} from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { watchStatusOptions } from "../components/watch-status-control";
import { PageMessage } from "../components/page-message";
import { AnimeCard } from "../components/ui/anime-card";
import { Button } from "../components/ui/button";
import { InfoCard } from "../components/ui/info-card";
import { NativeSelect } from "../components/ui/native-select";
import { getProfile } from "../server/profile";

const tabs = [
  ...watchStatusOptions.map(({ value, label, Icon }) => ({
    id: value,
    label,
    Icon,
  })),
  { id: "collections" as const, label: "Collections", Icon: LayersIcon },
  { id: "reviews" as const, label: "Reviews", Icon: ChatBubbleIcon },
];

const sortOptions = {
  watching: [
    { id: "newest", label: "Recently updated" },
    { id: "title", label: "Title A–Z" },
    { id: "score", label: "Highest score" },
  ],
  plan_to_watch: [
    { id: "newest", label: "Recently updated" },
    { id: "title", label: "Title A–Z" },
    { id: "score", label: "Highest score" },
  ],
  completed: [
    { id: "newest", label: "Recently updated" },
    { id: "title", label: "Title A–Z" },
    { id: "score", label: "Highest score" },
  ],
  collections: [
    { id: "newest", label: "Newest" },
    { id: "name", label: "Name A–Z" },
  ],
  reviews: [
    { id: "newest", label: "Newest" },
    { id: "rating", label: "Highest rating" },
  ],
} as const;

const sortIds = ["newest", "title", "score", "name", "rating"] as const;

export const Route = createFileRoute("/_main/users_/$userId")({
  validateSearch: z.object({
    tab: z
      .enum([
        "watching",
        "plan_to_watch",
        "completed",
        "collections",
        "reviews",
      ])
      .optional()
      .catch(undefined),
    page: z.coerce.number().int().min(1).max(1000).default(1).catch(1),
    sort: z.enum(sortIds).optional().catch(undefined),
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ params, deps }) => {
    const profile = await getProfile({
      data: {
        userId: params.userId,
        tab: deps.tab ?? "watching",
        page: deps.page,
        sort: deps.sort,
      },
    });

    if (!profile) throw notFound();

    return profile;
  },
  head: ({ loaderData }) => ({
    meta: loaderData ? [{ title: `${loaderData.owner.name} | Anihub` }] : [],
  }),
  component: Profile,
  notFoundComponent: () => (
    <PageMessage heading="User not found" body="This profile doesn't exist." />
  ),
  errorComponent: ProfileError,
});

function Profile() {
  const profile = Route.useLoaderData();
  const search = Route.useSearch();
  const options = sortOptions[profile.tab];
  const count = profile.counts[profile.tab];

  return (
    <section className="pb-16">
      <div className="relative h-[240px] w-full overflow-hidden md:h-[300px]">
        {profile.banner && (
          <img
            src={profile.banner}
            alt=""
            className="h-full w-full object-cover object-[center_25%] opacity-50 [mask-image:linear-gradient(to_bottom,#000_30%,#0000_95%)]"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background" />
      </div>
      <div className="container px-4">
        <div className="flex items-end gap-4">
          <img
            src={profile.owner.avatar}
            alt=""
            width={112}
            height={112}
            className="h-24 w-24 rounded-full border-4 border-background object-cover md:h-28 md:w-28"
          />
          <h1 className="-mb-1 break-words pb-2 text-3xl font-extrabold md:text-4xl">
            {profile.owner.name}
          </h1>
        </div>
        <div className="mt-6 flex flex-wrap items-end gap-x-1 border-b border-zinc-800">
          <nav aria-label="Profile sections" className="flex flex-wrap gap-x-1">
            {tabs.map((tab) => {
              const active = profile.tab === tab.id;
              const Icon = tab.Icon;

              return (
                <Link
                  key={tab.id}
                  to="/users/$userId"
                  params={{ userId: profile.owner.id }}
                  search={{ tab: tab.id, page: 1 }}
                  aria-current={active ? "page" : undefined}
                  className={`-mb-px flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active ? "border-white text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                >
                  <Icon aria-hidden="true" className="h-4 w-4" />
                  {tab.label}
                  <span className="text-xs text-muted-foreground">
                    {profile.counts[tab.id]}
                  </span>
                </Link>
              );
            })}
          </nav>
          <form method="get" className="ml-auto flex items-center gap-2 pb-1.5">
            <input type="hidden" name="tab" value={profile.tab} />
            <NativeSelect
              className="w-[180px]"
              aria-label="Sort by"
              name="sort"
              defaultValue={profile.sort}
              onChange={(event) => event.currentTarget.form?.requestSubmit()}
            >
              {options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </NativeSelect>
            <noscript>
              <Button type="submit" variant="secondary" size="sm">
                Apply
              </Button>
            </noscript>
          </form>
        </div>
        <div className="mt-6">
          {profile.tab === "collections" ? (
            profile.collections.length === 0 ? (
              <Empty>No collections to show.</Empty>
            ) : (
              <ul className="grid items-start gap-6 md:grid-cols-2 xl:grid-cols-3">
                {profile.collections.map((collection) => {
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
                    <li key={collection.id} className="min-w-0">
                      <Link
                        to="/collections/$collectionId"
                        params={{ collectionId: collection.id }}
                        className="flex min-w-0 flex-col gap-3 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
                      >
                        <InfoCard heading={collection.name} images={images} />
                        <p className="line-clamp-1 text-sm text-muted-foreground">
                          {collection.items.length} titles
                        </p>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )
          ) : profile.tab === "reviews" ? (
            profile.reviews.length === 0 ? (
              <Empty>No reviews yet.</Empty>
            ) : (
              <ul className="space-y-3">
                {profile.reviews.map((review) => (
                  <ProfileReview
                    key={review.id}
                    review={review}
                    isSelf={profile.isSelf}
                  />
                ))}
              </ul>
            )
          ) : profile.watch.length === 0 ? (
            <Empty>Nothing here yet.</Empty>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {profile.watch.map((item) => (
                <li key={item.animeId} className="min-w-0">
                  <Link
                    to="/anime/$id"
                    params={{ id: String(item.animeId) }}
                    className="block rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    {item.anime ? (
                      <AnimeCard
                        anime={item.anime}
                        loading="lazy"
                        sizes="(min-width: 1024px) 15vw, (min-width: 640px) 30vw, 45vw"
                      />
                    ) : (
                      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-zinc-900">
                        <img
                          src={item.image}
                          alt=""
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/90 to-transparent p-3 pt-10 text-sm font-semibold text-white">
                          {item.title}
                        </span>
                      </div>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        {profile.hasNextPage && (
          <div className="mt-6">
            <Button asChild variant="secondary" size="default">
              <Link
                to="/users/$userId"
                params={{ userId: profile.owner.id }}
                search={{ ...search, page: search.page + 1 }}
              >
                More
              </Link>
            </Button>
          </div>
        )}
        {profile.tab !== "collections" &&
          profile.tab !== "reviews" &&
          count === 0 && <p className="sr-only">No titles in {profile.tab}.</p>}
      </div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-zinc-800 px-6 py-12 text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}

type ProfileResult = NonNullable<Awaited<ReturnType<typeof getProfile>>>;

function ProfileReview({
  review,
  isSelf,
}: {
  review: ProfileResult["reviews"][number];
  isSelf: boolean;
}) {
  const [revealed, setRevealed] = useState(false);

  const masked = review.isSpoiler && !revealed && !isSelf;

  const date = new Date(review.createdAt).toLocaleDateString("en-GB", {
    dateStyle: "medium",
    timeZone: "UTC",
  });

  return (
    <li className="flex min-w-0 gap-3 py-2">
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

function ProfileError() {
  const router = useRouter();

  return (
    <PageMessage
      heading="Couldn't load this profile"
      body="Nothing has changed. Please try again."
      onRetry={() => router.invalidate()}
    />
  );
}
