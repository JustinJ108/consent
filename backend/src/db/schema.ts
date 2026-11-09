import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";

export const staffRoleEnum = pgEnum("staff_role", ["admin", "caseworker"]);

export const categoryEnum = pgEnum("client_category", [
  "contact",
  "housing",
  "health",
  "financial",
  "legal",
  "other",
]);

export const auditActionEnum = pgEnum("audit_action", [
  "read",
  "write",
  "consent_grant",
  "consent_revoke",
]);

export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const staff = pgTable("staff", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: staffRoleEnum("role").notNull().default("caseworker"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// The master record for a client. Owned by the org that first created it.
export const clients = pgTable("clients", {
  id: uuid("id").defaultRandom().primaryKey(),
  fullName: text("full_name").notNull(),
  ownerOrgId: uuid("owner_org_id").notNull().references(() => organizations.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// One row per (client, category). Arbitrary shape per category lives in `data`.
export const clientRecords = pgTable("client_records", {
  id: uuid("id").defaultRandom().primaryKey(),
  clientId: uuid("client_id").notNull().references(() => clients.id),
  category: categoryEnum("category").notNull(),
  data: jsonb("data").notNull(),
  updatedByStaffId: uuid("updated_by_staff_id").notNull().references(() => staff.id),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// A client's approval for a specific org to see a specific category of their data.
export const consents = pgTable("consents", {
  id: uuid("id").defaultRandom().primaryKey(),
  clientId: uuid("client_id").notNull().references(() => clients.id),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  category: categoryEnum("category").notNull(),
  grantedByStaffId: uuid("granted_by_staff_id").notNull().references(() => staff.id),
  grantedAt: timestamp("granted_at", { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
});

// Append-only trail of every access decision, for compliance review.
export const auditLog = pgTable("audit_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  actorStaffId: uuid("actor_staff_id").references(() => staff.id),
  clientId: uuid("client_id").notNull().references(() => clients.id),
  orgId: uuid("org_id").notNull().references(() => organizations.id),
  action: auditActionEnum("action").notNull(),
  category: categoryEnum("category"),
  allowed: boolean("allowed").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
