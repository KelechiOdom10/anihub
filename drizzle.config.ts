import { type Config } from "drizzle-kit";

import { env } from "@/env";
import { DATABASE_PREFIX } from "@/lib/constants";

export default {
  schema: "./src/server/db/schema/index.ts",
  out: "./drizzle",
  driver: "mysql2",
  dbCredentials: {
    uri: env.DATABASE_URL,
  },
  tablesFilter: [`${DATABASE_PREFIX}_*`],
} satisfies Config;
