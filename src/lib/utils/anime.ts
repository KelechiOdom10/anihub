import { type TitleType } from "~/server/api/modules/shared";

export const getEnglishTitle = (titles: Array<TitleType> | null) => {
  if (!titles || titles.length === 0) return "N/A";

  const englishTitle = titles.find((title) => title?.type === "English")?.title;
  if (englishTitle) return englishTitle;

  const defaultTitle = titles.find((title) => title?.type === "Default")?.title;
  if (defaultTitle) return defaultTitle;

  const japaneseTitle = titles.find(
    (title) => title?.type === "Japanese"
  )?.title;
  if (japaneseTitle) return japaneseTitle;

  return titles[0]?.title ?? "N/A";
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
