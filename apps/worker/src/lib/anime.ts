import type { Anime } from "../server/anime";

const statusLabels = new Map([
  ["FINISHED", "Finished Airing"],
  ["RELEASING", "Currently Airing"],
  ["NOT_YET_RELEASED", "Not yet aired"],
  ["CANCELLED", "Cancelled"],
  ["HIATUS", "On Hiatus"],
]);

export function englishTitle(anime: Anime) {
  return anime.title.english ?? anime.title.romaji;
}

export function plainDescription(anime: Anime) {
  return (anime.description ?? "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function statusLabel(anime: Anime) {
  return statusLabels.get(anime.status) ?? anime.status;
}

export function score(anime: Anime) {
  return anime.averageScore === null
    ? null
    : (anime.averageScore / 10).toFixed(1);
}

export function airedDate({ year, month, day }: Anime["startDate"]) {
  if (year === null) return "Unknown";

  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: month === null ? undefined : "long",
    day: month === null || day === null ? undefined : "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1)));
}
