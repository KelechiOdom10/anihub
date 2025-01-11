import { OAuth2RequestError } from "arctic";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";

import { discord } from "~/lib/auth";
import { setSession } from "~/lib/auth/session";
import { redirects } from "~/lib/constants";
import { db } from "~/server/db";
import { oauthAccounts, users } from "~/server/db/schema";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const storedState = cookies().get("discord_oauth_state")?.value ?? null;

  if (!code || !state || !storedState || state !== storedState) {
    return new Response(null, {
      status: 400,
      headers: { Location: redirects.toLogin },
    });
  }

  try {
    const tokens = await discord.validateAuthorizationCode(code);

    const discordUserRes = await fetch("https://discord.com/api/users/@me", {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
    });
    const discordUser = (await discordUserRes.json()) as DiscordUser;

    if (!discordUser.email || !discordUser.verified) {
      return new Response(
        JSON.stringify({
          error: "Your Discord account must have a verified email address.",
        }),
        { status: 400, headers: { Location: redirects.toLogin } }
      );
    }
    const avatar = discordUser.avatar
      ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.webp`
      : null;

    const existingUser = await db.query.users.findFirst({
      where: (table, { eq }) => eq(table.email, discordUser.email!),
    });

    if (existingUser) {
      const existingAccount = await db.query.oauthAccounts.findFirst({
        where: (table, { eq, and }) =>
          and(
            eq(table.provider, "discord"),
            eq(table.providerUserId, discordUser.id)
          ),
      });

      if (!existingAccount) {
        await db.insert(oauthAccounts).values({
          userId: existingUser.id,
          provider: "discord",
          providerUserId: discordUser.id,
        });
      }

      if (
        existingAccount?.providerUserId !== discordUser.id ||
        existingUser?.avatar !== avatar
      ) {
        await db.transaction(async (tx) => {
          await tx
            .update(oauthAccounts)
            .set({
              providerUserId: discordUser.id,
            })
            .where(eq(users.id, existingUser?.id));

          await tx
            .update(users)
            .set({
              emailVerified: true,
              avatar,
              username:
                existingAccount?.providerUserId !== discordUser.id ||
                existingUser?.avatar !== avatar
                  ? discordUser.username || discordUser.global_name
                  : existingUser.username,
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
          email: discordUser.email!,
          username: discordUser.username || discordUser.global_name,
          emailVerified: true,
          avatar,
        })
        .returning({ id: users.id });

      if (!user) {
        throw new Error("Failed to create user");
      }

      userId = user.id;

      await tx.insert(oauthAccounts).values({
        userId,
        provider: "discord",
        providerUserId: discordUser.id,
      });
    });

    if (!userId) {
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
}

interface DiscordUser {
  id: string;
  username: string;
  avatar: string | null;
  banner: string | null;
  global_name: string | null;
  banner_color: string | null;
  mfa_enabled: boolean;
  locale: string;
  email: string | null;
  verified: boolean;
}
