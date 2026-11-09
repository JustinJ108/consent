export type Category =
  | "contact"
  | "housing"
  | "health"
  | "financial"
  | "legal"
  | "other";

export const CATEGORIES: readonly Category[] = [
  "contact",
  "housing",
  "health",
  "financial",
  "legal",
  "other",
];

/**
 * The shape of a consent row, trimmed to just what the authorization
 * decision needs. Kept independent of the Drizzle schema so this logic
 * can be unit tested without a database.
 */
export interface ConsentRecord {
  orgId: string;
  category: Category;
  expiresAt: Date | null;
  revokedAt: Date | null;
}

/**
 * A consent is active if it hasn't been revoked and, if it has an
 * expiry, that expiry hasn't passed yet. This is the single source of
 * truth for "can org X see category Y of this client's data" — every
 * route that reads or writes client data must go through it.
 */
export function hasActiveConsent(
  consents: ConsentRecord[],
  orgId: string,
  category: Category,
  now: Date = new Date(),
): boolean {
  return consents.some(
    (c) =>
      c.orgId === orgId &&
      c.category === category &&
      c.revokedAt === null &&
      (c.expiresAt === null || c.expiresAt.getTime() > now.getTime()),
  );
}

/**
 * Given all of a client's consents for one org, returns just the
 * categories currently readable by that org.
 */
export function readableCategories(
  consents: ConsentRecord[],
  orgId: string,
  now: Date = new Date(),
): Category[] {
  return CATEGORIES.filter((category) =>
    hasActiveConsent(consents, orgId, category, now),
  );
}
