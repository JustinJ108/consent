export const CATEGORIES = [
  "contact",
  "housing",
  "health",
  "financial",
  "legal",
  "other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  contact: "Contact",
  housing: "Housing",
  health: "Health",
  financial: "Financial",
  legal: "Legal",
  other: "Other",
};

export interface Me {
  staffId: string;
  email: string;
  role: "admin" | "caseworker";
  org: { id: string; name: string };
}

export interface Client {
  id: string;
  fullName: string;
  ownerOrgId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClientDetail {
  id: string;
  fullName: string;
  isOwner: boolean;
  records: Partial<Record<Category, Record<string, unknown>>>;
}

export interface Consent {
  id: string;
  clientId: string;
  orgId: string;
  category: Category;
  grantedByStaffId: string;
  grantedAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
}

export interface Organization {
  id: string;
  name: string;
}

export type AuditAction = "read" | "write" | "consent_grant" | "consent_revoke";

export interface AuditEntry {
  id: string;
  actorStaffId: string | null;
  clientId: string;
  orgId: string;
  action: AuditAction;
  category: Category | null;
  allowed: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export function isConsentActive(consent: Consent, now = new Date()): boolean {
  if (consent.revokedAt) return false;
  if (consent.expiresAt && new Date(consent.expiresAt).getTime() <= now.getTime()) {
    return false;
  }
  return true;
}
