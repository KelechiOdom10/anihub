import { drizzle } from "drizzle-orm/d1";
import type { Env } from "../env";
import * as schema from "./schema";

export function createDb(env: Pick<Env, "DB">) {
  return drizzle(env.DB, { schema });
}

export type Db = ReturnType<typeof createDb>;
export * from "./schema";
