import { useRouteContext } from "@tanstack/react-router";
import {
  airedDate,
  englishTitle,
  plainDescription,
  score,
  statusLabel,
} from "../lib/anime";
import type { Anime } from "../server/anime";
import { ChooseCollectionDialog } from "./choose-collection-dialog";
import { CreateCollectionDialog } from "./create-collection-dialog";
import { HeroBackdrop } from "./hero";

export function AnimeHeader({ anime }: { anime: Anime }) {
  return (
    <div className="relative z-0 h-[260px] w-full overflow-hidden md:h-[380px]">
      <HeroBackdrop anime={anime} fit="height" />
    </div>
  );
}

export function AnimeToolbar({ anime }: { anime: Anime }) {
  const rating = score(anime);
  const { viewer } = useRouteContext({ from: "__root__" });

  return (
    <div className="mx-auto flex max-w-5xl items-center gap-8 px-6 py-8 xl:max-w-7xl">
      <img
        fetchPriority="high"
        loading="eager"
        src={anime.coverImage.extraLarge}
        alt={englishTitle(anime)}
        width={180}
        height={270}
        className="z-30 -mt-24 hidden aspect-[2/3] w-[180px] rounded-md object-cover lg:block"
      />
      <div className="flex w-full flex-col gap-3 self-start">
        <h1 className="text-xl font-semibold lg:text-2xl">
          {englishTitle(anime)}
        </h1>
        {rating && <p className="text-base text-gray-400">★ {rating}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <ChooseCollectionDialog animeId={anime.id} viewer={viewer} />
          <CreateCollectionDialog
            animeId={anime.id}
            signedIn={Boolean(viewer)}
          />
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-2 gap-0 text-sm">
      <h3 className="font-normal text-neutral-400">{label}</h3>
      <p>{value}</p>
    </div>
  );
}

export function AnimeOverview({ anime }: { anime: Anime }) {
  return (
    <div className="grid w-full grid-cols-1 gap-20 md:grid-cols-4 md:gap-24">
      <div className="col-span-1 flex flex-col gap-3">
        <h2 className="text-xl font-bold">Details</h2>
        {anime.format && <Detail label="Type" value={anime.format} />}
        {anime.episodes && (
          <Detail label="Episodes" value={String(anime.episodes)} />
        )}
        <Detail label="Status" value={statusLabel(anime)} />
        <Detail
          label="Aired"
          value={`${airedDate(anime.startDate)} to ${airedDate(anime.endDate)}`}
        />
        <Detail label="Genres" value={anime.genres.join(", ")} />
        <Detail
          label="Studios"
          value={anime.studios.nodes.map((studio) => studio.name).join(", ")}
        />
      </div>
      <div className="col-span-1 flex flex-col gap-3 md:col-span-3">
        <h2 className="text-xl font-bold">Description</h2>
        <p className="leading-relaxed text-zinc-300">
          {plainDescription(anime)}
        </p>
      </div>
    </div>
  );
}

export function AnimePageSkeleton() {
  return (
    <div>
      <div className="relative h-[260px] w-full overflow-hidden md:h-[380px]">
        <div className="h-full w-full animate-pulse bg-zinc-800" />
      </div>
      <div className="mx-auto flex max-w-5xl items-center gap-4 px-6 py-8 xl:max-w-7xl">
        <div className="z-30 -mt-24 hidden aspect-[2/3] w-[180px] animate-pulse rounded-md bg-zinc-800 lg:block" />
        <div className="flex w-full flex-col gap-4 self-start">
          <div className="h-8 w-2/3 animate-pulse rounded-md bg-zinc-800" />
          <div className="h-6 w-20 animate-pulse rounded-md bg-zinc-800" />
        </div>
      </div>
      <div className="mx-auto max-w-5xl px-4 py-8 xl:max-w-7xl">
        <div className="grid gap-4 px-4 py-6 lg:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-24 w-full animate-pulse rounded-md bg-zinc-800"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
