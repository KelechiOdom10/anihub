import { type AnimeQueryData } from "~/graphql/queries";
import { formatDate } from "~/lib/utils";

export const AnimeOverview = ({ anime }: { anime: AnimeQueryData }) => {
  const aired = anime.aired?.from ? formatDate(anime.aired?.from) : "Unknown";
  const ended = anime.aired?.to ? formatDate(anime.aired?.to) : "Unknown";

  return (
    <div className="grid w-full grid-cols-1 gap-20 px-4 py-6 md:grid-cols-4 md:gap-24">
      <div className="col-span-1 flex flex-col gap-3">
        <h2 className="text-2xl font-bold">Details</h2>
        {anime.type && (
          <div className="grid grid-cols-2 gap-0 text-sm">
            <h3 className="font-normal text-neutral-400">Type</h3>
            <p>{anime.type}</p>
          </div>
        )}
        {anime.episodes && (
          <div className="grid grid-cols-2 gap-0 text-sm">
            <h3 className="font-normal text-neutral-400">Episodes</h3>
            <p>{anime.episodes}</p>
          </div>
        )}
        <div className="grid grid-cols-2 gap-0 text-sm">
          <h3 className="font-normal text-neutral-400">Status</h3>
          <p>{anime.status}</p>
        </div>
        <div className="grid grid-cols-2 gap-0 text-sm">
          <h3 className="font-normal text-neutral-400">Aired</h3>
          <p>
            {aired} to {ended}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-0 text-sm">
          <h3 className="font-normal text-neutral-400">Genres</h3>
          <p>{anime.genres?.map((g) => g.name).join(", ")}</p>
        </div>
        <div className="grid grid-cols-2 gap-0 text-sm">
          <h3 className="font-normal text-neutral-400">Studios</h3>
          <p>{anime.studios?.map((s) => s.name).join(", ")}</p>
        </div>
      </div>
      <div className="col-span-1 flex flex-col gap-3 md:col-span-3">
        <h2 className="text-2xl font-bold">Description</h2>
        <p>{anime.synopsis}</p>
      </div>
    </div>
  );
};
