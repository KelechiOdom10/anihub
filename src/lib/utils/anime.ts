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

export function extractCharacterDetails(
  description: string
): Record<string, string | undefined> {
  const details: Record<string, string | undefined> = {};
  const patterns: Record<string, RegExp> = {
    age: /Age:\s*([^\n]+)/,
    birthday: /Birthday:\s*([^\n]+)/,
    height: /Height:\s*([^\n]+)/,
    weight: /Weight:\s*([^\n]+)/,
    abilities: /Abilities:\s*([^]+?)(?:\n\n|$)/,
    occupation: /Occupation:\s*([^\n]+)/,
    eyeColor: /Eye Color:\s*([^\n]+)/,
    bloodType: /Blood Type:\s*([^\n]+)/,
    likes: /Likes:\s*([^\n]+)/,
    dislikes: /Dislikes:\s*([^\n]+)/,
    affiliations: /Affiliations:\s*([^\n]+)/,
    nenType: /Nen Type:\s*([^\n]+)/,
    equipment: /Equipment:\s*([^\n]+)/,
    affiliation: /Affiliation:\s*([^\n]+)/,
    position: /Position:\s*([^\n]+)/,
  };

  for (const [key, pattern] of Object.entries(patterns)) {
    const match = description.match(pattern);
    if (match?.[1]) {
      details[key] = match[1].trim();
    }
  }

  return details;
}
