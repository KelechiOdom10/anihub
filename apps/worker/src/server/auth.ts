import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/d1";
import { account, session, user, verification } from "../db/schema";
import { normalizedEmail } from "./email";

export type AuthSettings = {
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  DISCORD_CLIENT_ID: string;
  DISCORD_CLIENT_SECRET: string;
};

function verifiedEmail(email: string | null | undefined, verified: boolean) {
  const parsed = normalizedEmail.safeParse(email);

  if (!verified || !parsed.success)
    throw new APIError("FORBIDDEN", {
      message: "Sign in needs a verified email address",
    });

  return { email: parsed.data, emailVerified: true };
}

export function createAuth(database: D1Database, settings: AuthSettings) {
  return betterAuth({
    secret: settings.BETTER_AUTH_SECRET,
    baseURL: settings.BETTER_AUTH_URL,
    database: drizzleAdapter(drizzle(database), {
      provider: "sqlite",
      schema: { user, session, account, verification },
    }),
    emailAndPassword: { enabled: false },
    socialProviders: {
      google: {
        clientId: settings.GOOGLE_CLIENT_ID,
        clientSecret: settings.GOOGLE_CLIENT_SECRET,
        disableIdTokenSignIn: true,
        mapProfileToUser: (profile) =>
          verifiedEmail(profile.email, profile.email_verified),
      },
      discord: {
        clientId: settings.DISCORD_CLIENT_ID,
        clientSecret: settings.DISCORD_CLIENT_SECRET,
        mapProfileToUser: (profile) =>
          verifiedEmail(profile.email, profile.verified),
      },
    },
    account: {
      accountLinking: {
        enabled: true,
        trustedProviders: [],
        allowDifferentEmails: false,
        requireLocalEmailVerified: false,
      },
    },
    user: {
      additionalFields: {
        username: { type: "string", required: false, input: false },
      },
    },
  });
}
