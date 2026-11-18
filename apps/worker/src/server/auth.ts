import { betterAuth } from "better-auth";
import { APIError, getOAuthState } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/d1";
import { z } from "zod";
import { account, session, user, verification } from "../db/schema";
import { privacyPolicyVersion } from "../lib/privacy";
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

const consentState = z.object({
  privacyConsent: z.literal(privacyPolicyVersion),
});

const recordedConsent = z.object({
  privacyPolicyVersion: z.literal(privacyPolicyVersion),
});

async function consented() {
  return consentState.safeParse(await getOAuthState()).success;
}

const withoutTokens = <T extends object>(account: T) => ({
  data: {
    ...account,
    accessToken: null,
    refreshToken: null,
    idToken: null,
    accessTokenExpiresAt: null,
    refreshTokenExpiresAt: null,
  },
});

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
        privacyPolicyVersion: { type: "string", required: false, input: false },
        privacyConsentedAt: { type: "date", required: false, input: false },
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (data) => {
            if (!(await consented()))
              throw new APIError("FORBIDDEN", {
                message: "Sign up needs agreement to the privacy policy",
              });

            return {
              data: {
                ...data,
                image: null,
                privacyPolicyVersion,
                privacyConsentedAt: new Date(),
              },
            };
          },
        },
        update: {
          before: async (data) => ({ data: { ...data, image: undefined } }),
        },
      },
      account: {
        create: {
          before: async (account, context) => {
            const adapter = context?.context.internalAdapter;
            const owner = await adapter?.findUserById(account.userId);

            if (!recordedConsent.safeParse(owner).success) {
              if (!adapter || !(await consented()))
                throw new APIError("FORBIDDEN", {
                  message:
                    "Linking a sign-in needs agreement to the privacy policy",
                });

              await adapter.updateUser(account.userId, {
                privacyPolicyVersion,
                privacyConsentedAt: new Date(),
              });
            }

            return withoutTokens(account);
          },
        },
        update: { before: async (account) => withoutTokens(account) },
      },
      session: {
        create: {
          before: async (created, context) => {
            const adapter = context?.context.internalAdapter;

            if (!adapter || !(await consented())) return;

            const owner = await adapter.findUserById(created.userId);

            if (recordedConsent.safeParse(owner).success) return;

            await adapter.updateUser(created.userId, {
              privacyPolicyVersion,
              privacyConsentedAt: new Date(),
            });
          },
        },
      },
    },
  });
}
