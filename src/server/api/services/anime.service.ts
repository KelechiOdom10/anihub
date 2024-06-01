import createClient from "openapi-fetch";
import type { paths } from "../../jikan-schema";

export const animeService = createClient<paths>({
  baseUrl: "https://api.jikan.moe/v4",
});
