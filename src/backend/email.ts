export function normalizeEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new Error("A valid email address is required");
  }
  return normalized;
}

export function verifiedProviderEmail(email: unknown, verified: unknown) {
  if (typeof email !== "string" || verified !== true) {
    throw new Error("Sign in requires a verified provider email");
  }
  return { email: normalizeEmail(email), emailVerified: true as const };
}
