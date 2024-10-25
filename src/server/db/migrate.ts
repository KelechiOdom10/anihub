import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";

import * as schema from "./schema";

export async function runMigrate() {
  if (!process.env.DATABASE_URL) {
    throw new Error("TURSO_DATABASE_URL is not defined");
  }

  if (!process.env.DATABASE_AUTH_TOKEN) {
    throw new Error("TURSO_AUTH_TOKEN is not defined");
  }

  const db = drizzle(
    createClient({
      url: process.env.DATABASE_URL,
      authToken: process.env.DATABASE_AUTH_TOKEN,
    }),
    { schema }
  );
  console.log("⏳ Running migrations...");

  const start = Date.now();

  await migrate(db, { migrationsFolder: "drizzle" });

  const end = Date.now();

  console.log(`✅ Migrations completed in ${end - start}ms`);

  process.exit(0);
}

runMigrate().catch((err) => {
  console.error("❌ Migration failed");
  console.error(err);
  process.exit(1);
});
