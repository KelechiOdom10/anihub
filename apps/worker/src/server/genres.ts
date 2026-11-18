import type { Anime } from "./anime";

export const legacyGenreIds = new Map([
  ["1", "Action"],
  ["2", "Adventure"],
  ["4", "Comedy"],
  ["7", "Mystery"],
  ["8", "Drama"],
  ["9", "Ecchi"],
  ["10", "Fantasy"],
  ["14", "Horror"],
  ["18", "Mecha"],
  ["19", "Music"],
  ["22", "Romance"],
  ["24", "Sci-Fi"],
  ["30", "Sports"],
  ["36", "Slice of Life"],
  ["37", "Supernatural"],
  ["40", "Psychological"],
  ["66", "Mahou Shoujo"],
]);

export function pickCategories(genres: string[], day: string) {
  let seed = [...day].reduce(
    (hash, character) => Math.imul(hash ^ character.charCodeAt(0), 16777619),
    2166136261
  );

  const pool = [...genres].sort();
  const picked: string[] = [];

  while (picked.length < 3 && pool.length > 0) {
    seed = Math.imul(seed ^ (seed >>> 15), 2246822507);
    seed = Math.imul(seed ^ (seed >>> 13), 3266489909);
    picked.push(...pool.splice((seed >>> 0) % pool.length, 1));
  }

  return picked;
}

export function chooseCovers(pages: Array<{ genre: string; anime: Anime[] }>) {
  const shown = new Set<number>();

  return pages.flatMap(({ genre, anime }) => {
    const covers = anime.filter((entry) => !shown.has(entry.id)).slice(0, 3);

    for (const entry of covers) shown.add(entry.id);

    return covers.length > 0 ? [{ genre, anime: covers }] : [];
  });
}
