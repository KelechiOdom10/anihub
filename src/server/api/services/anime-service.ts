import createClient from "openapi-fetch";
import type { paths } from "../../jikan-schema.ts";

export const animeService = createClient<paths>({
  baseUrl: "https://api.jikan.moe/v4",
});
