import { type AnimeTitle } from "~/server/api/modules/anime";

export const getEnglishTitle = (titles: Array<AnimeTitle> | null) => {
  let englishTitle;
  let japaneseTitle;
  for (const title of titles ?? []) {
    if (title.type === "English") {
      englishTitle = title;
      break;
    } else if (title.type === "Japanese") {
      japaneseTitle = title;
    }
  }
  return (
    englishTitle?.title ?? japaneseTitle?.title ?? titles?.[0]?.title ?? "N/A"
  );
};
