import { defineEnv, string, url } from "void/env";

export default defineEnv({
  BETTER_AUTH_SECRET: string(),
  BETTER_AUTH_URL: url(),
  GOOGLE_CLIENT_ID: string(),
  GOOGLE_CLIENT_SECRET: string(),
  DISCORD_CLIENT_ID: string(),
  DISCORD_CLIENT_SECRET: string(),
});
