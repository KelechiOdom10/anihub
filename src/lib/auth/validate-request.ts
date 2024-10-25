import { cache } from "react";

import { getSessionToken } from "./session";

import { type SessionValidationResult, validateSessionToken } from ".";

export async function uncachedValidateRequest(): Promise<SessionValidationResult> {
  const sessionToken = getSessionToken();
  if (!sessionToken) {
    return { session: null, user: null };
  }

  return validateSessionToken(sessionToken);
}

export const validateRequest = cache(uncachedValidateRequest);
