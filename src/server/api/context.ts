import { initContextCache } from "@pothos/core";
import { type YogaInitialContext } from "graphql-yoga";
import { type Session } from "lucia";

import { type Db, db } from "../db";

import { uncachedValidateRequest } from "~/lib/auth/validate-request";

export interface GraphqlServerContext {
  db: Db;
  session: Session | null;
}

export const createContext = async (_req: YogaInitialContext) => {
  const { session } = await uncachedValidateRequest();
  return {
    ...initContextCache(),
    db,
    session,
  };
};
