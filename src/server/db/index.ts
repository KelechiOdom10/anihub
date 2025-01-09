import { createClient } from "@libsql/client";
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/libsql";

import * as schema from "./schema";

config({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
  throw new Error("TURSO_DATABASE_URL is not defined");
}

if (!process.env.DATABASE_AUTH_TOKEN) {
  throw new Error("TURSO_AUTH_TOKEN is not defined");
}

export const client = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });
export type Db = typeof db;
