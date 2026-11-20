import { z } from "zod";

export const defaultAvatar = "/anime-male-avatar.avif";

export function publicIdentity(
  user: { name: string; image?: string | null },
  fallback = defaultAvatar
) {
  const image = z.url().safeParse(user.image);
  const url = image.success ? new URL(image.data) : null;

  const trusted =
    url?.protocol === "https:" &&
    !url.username &&
    !url.password &&
    !url.port &&
    (url.hostname === "cdn.discordapp.com" ||
      url.hostname === "media.discordapp.net" ||
      url.hostname === "googleusercontent.com" ||
      url.hostname.endsWith(".googleusercontent.com"));

  return {
    name:
      user.name.trim() && !user.name.includes("@")
        ? user.name.trim().slice(0, 100)
        : "Anonymous",
    avatar: trusted ? url.href : fallback,
  };
}
