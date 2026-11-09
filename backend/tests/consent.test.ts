import { describe, expect, it } from "vitest";
import { hasActiveConsent, readableCategories, type ConsentRecord } from "../src/lib/consent.js";

const ORG_A = "org-a";
const ORG_B = "org-b";

function consent(overrides: Partial<ConsentRecord> = {}): ConsentRecord {
  return {
    orgId: ORG_A,
    category: "health",
    expiresAt: null,
    revokedAt: null,
    ...overrides,
  };
}

describe("hasActiveConsent", () => {
  it("denies access when no consent exists", () => {
    expect(hasActiveConsent([], ORG_A, "health")).toBe(false);
  });

  it("allows access for a matching, unexpired, unrevoked consent", () => {
    const consents = [consent()];
    expect(hasActiveConsent(consents, ORG_A, "health")).toBe(true);
  });

  it("does not leak access to a different org", () => {
    const consents = [consent({ orgId: ORG_A })];
    expect(hasActiveConsent(consents, ORG_B, "health")).toBe(false);
  });

  it("does not leak access to a different category", () => {
    const consents = [consent({ category: "health" })];
    expect(hasActiveConsent(consents, ORG_A, "financial")).toBe(false);
  });

  it("denies access once revoked, regardless of expiry", () => {
    const consents = [consent({ revokedAt: new Date("2020-01-01") })];
    expect(hasActiveConsent(consents, ORG_A, "health")).toBe(false);
  });

  it("denies access once expired", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const consents = [consent({ expiresAt: new Date("2025-12-31T23:59:59Z") })];
    expect(hasActiveConsent(consents, ORG_A, "health", now)).toBe(false);
  });

  it("allows access when the expiry is still in the future", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const consents = [consent({ expiresAt: new Date("2026-06-01T00:00:00Z") })];
    expect(hasActiveConsent(consents, ORG_A, "health", now)).toBe(true);
  });

  it("treats a null expiry as never expiring", () => {
    const consents = [consent({ expiresAt: null })];
    expect(hasActiveConsent(consents, ORG_A, "health", new Date("2099-01-01"))).toBe(true);
  });
});

describe("readableCategories", () => {
  it("returns only the categories with an active consent", () => {
    const consents = [
      consent({ category: "health" }),
      consent({ category: "housing", revokedAt: new Date() }),
      consent({ category: "financial" }),
    ];
    expect(readableCategories(consents, ORG_A).sort()).toEqual(["financial", "health"]);
  });

  it("returns an empty list when nothing is granted", () => {
    expect(readableCategories([], ORG_A)).toEqual([]);
  });
});
