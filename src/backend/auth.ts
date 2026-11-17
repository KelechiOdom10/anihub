import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import type { Env } from "../env";
import { createDb } from "./db";
import { normalizeEmail, verifiedProviderEmail } from "./email";
import { account, session, user, verification } from "./schema";

export function createAuth(env: Env) {
  return betterAuth({
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    database: drizzleAdapter(createDb(env), {
      provider: "sqlite",
      schema: { user, session, account, verification },
      transaction: false,
    }),
    emailAndPassword: { enabled: false },
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        mapProfileToUser: (profile) => verifiedProviderEmail(profile.email, profile.email_verified),
      },
      discord: {
        clientId: env.DISCORD_CLIENT_ID,
        clientSecret: env.DISCORD_CLIENT_SECRET,
        mapProfileToUser: (profile) => verifiedProviderEmail(profile.email, profile.verified),
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
      additionalFields: { username: { type: "string", required: false, input: false } },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (value) => ({ data: { ...value, email: normalizeEmail(value.email) } }),
        },
        update: {
          before: async (value) => ({
            data: { ...value, ...(value.email ? { email: normalizeEmail(value.email) } : {}) },
          }),
        },
      },
    },
  });
}
