import { LibSQLAdapter } from "@lucia-auth/adapter-sqlite";
import { Discord, Google } from "arctic";
import { Lucia, TimeSpan } from "lucia";

import { env } from "~/env.js";
import { client } from "~/server/db";
import { type User as DbUser } from "~/server/db/schema";

const adapter = new LibSQLAdapter(client, {
  user: "user",
  session: "sessions",
});

export const lucia = new Lucia(adapter, {
  getSessionAttributes: (/* attributes */) => {
    return {};
  },
  getUserAttributes: (attributes) => {
    return {
      id: attributes.id,
      email: attributes.email,
      emailVerified: attributes.emailVerified,
      avatar: attributes.avatar,
      createdAt: attributes.createdAt,
      updatedAt: attributes.updatedAt,
    };
  },
  sessionExpiresIn: new TimeSpan(30, "d"),
  sessionCookie: {
    name: "session",

    expires: false, // session cookies have very long lifespan (2 years)
    attributes: {
      secure: env.NODE_ENV === "production",
    },
  },
});

export const discord = new Discord(
  env.DISCORD_CLIENT_ID,
  env.DISCORD_CLIENT_SECRET,
  env.NEXT_PUBLIC_APP_URL + "/login/discord/callback"
);

export const google = new Google(
  env.GOOGLE_CLIENT_ID,
  env.GOOGLE_CLIENT_SECRET,
  env.NEXT_PUBLIC_APP_URL + "/login/google/callback"
);

declare module "lucia" {
  interface Register {
    Lucia: typeof lucia;
    DatabaseSessionAttributes: DatabaseSessionAttributes;
    DatabaseUserAttributes: DatabaseUserAttributes;
  }
}

interface DatabaseSessionAttributes {}
interface DatabaseUserAttributes extends Omit<DbUser, "hashedPassword"> {}
