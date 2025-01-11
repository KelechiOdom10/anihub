import { OAuth2RequestError } from "arctic";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";

import { google } from "~/lib/auth";
import { setSession } from "~/lib/auth/session";
import { redirects } from "~/lib/constants";
import { db } from "~/server/db";
import { oauthAccounts, users } from "~/server/db/schema";

export const GET = async (request: Request): Promise<Response> => {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const storedState = cookies().get("google_oauth_state")?.value ?? null;
  const storedCodeVerifier =
    cookies().get("google_oauth_code_verifier")?.value ?? null;

  if (
    !code ||
    !state ||
    !storedState ||
    state !== storedState ||
    !storedCodeVerifier
  ) {
    return new Response(null, {
      status: 400,
      headers: { Location: redirects.toLogin },
    });
  }

  try {
    const tokens = await google.validateAuthorizationCode(
      code,
      storedCodeVerifier
    );

    const googleUserRes = await fetch(
      "https://openidconnect.googleapis.com/v1/userinfo",
      {
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
        },
      }
    );
    const googleUser = (await googleUserRes.json()) as GoogleUser;

    if (!googleUser.email || !googleUser.email_verified) {
      return new Response(
        JSON.stringify({
          error: "Your Google account must have a verified email address.",
        }),
        { status: 400, headers: { Location: redirects.toLogin } }
      );
    }
    const avatar = googleUser.picture;

    const existingUser = await db.query.users.findFirst({
      where: (table, { eq }) => eq(table.email, googleUser.email),
    });

    if (existingUser) {
      const existingAccount = await db.query.oauthAccounts.findFirst({
        where: (table, { eq, and }) =>
          and(
            eq(table.provider, "google"),
            eq(table.providerUserId, googleUser.sub)
          ),
      });

      if (!existingAccount) {
        await db.insert(oauthAccounts).values({
          userId: existingUser.id,
          provider: "google",
          providerUserId: googleUser.sub,
        });
      }

      if (
        existingAccount?.providerUserId !== googleUser.sub ||
        existingUser?.avatar !== avatar
      ) {
        await db.transaction(async (tx) => {
          await tx
            .update(oauthAccounts)
            .set({
              providerUserId: googleUser.sub,
            })
            .where(eq(users.id, existingUser?.id));

          await tx
            .update(users)
            .set({
              emailVerified: true,
              avatar,
              username: googleUser.name,
            })
            .where(eq(users.id, existingUser?.id));
        });
      }

      await setSession(existingUser.id);

      return new Response(null, {
        status: 302,
        headers: { Location: redirects.afterLogin },
      });
    }

    let userId: number | undefined;

    await db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({
          email: googleUser.email,
          emailVerified: true,
          avatar,
          username: googleUser.name,
        })
        .returning({ id: users.id });

      if (!user) {
        throw new Error("Failed to create user");
      }

      userId = user.id;

      await tx.insert(oauthAccounts).values({
        userId,
        provider: "google",
        providerUserId: googleUser.sub,
      });
    });

    if (userId === undefined) {
      throw new Error("Failed to create user");
    }

    await setSession(userId);

    return new Response(null, {
      status: 302,
      headers: { Location: redirects.afterLogin },
    });
  } catch (e) {
    // the specific error message depends on the provider
    if (e instanceof OAuth2RequestError) {
      // invalid code
      return new Response(JSON.stringify({ message: "Invalid code" }), {
        status: 400,
      });
    }

    return new Response(JSON.stringify({ message: "internal server error" }), {
      status: 500,
    });
  }
};
type GoogleUser = {
  sub: string;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  email: string;
  email_verified: boolean;
  locale: string;
  hd: string;
};
