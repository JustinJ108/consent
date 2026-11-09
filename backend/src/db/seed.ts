import { fileURLToPath, pathToFileURL } from "node:url";
import { db, closeDb } from "./client.js";
import { runMigrations } from "./migrate.js";
import {
  organizations,
  staff,
  clients,
  clientRecords,
  consents,
  auditLog,
} from "./schema.js";
import { hashPassword } from "../lib/auth.js";
import { CATEGORIES, type Category } from "../lib/consent.js";

/**
 * Demo seed data.
 *
 * Everything here is fictional. The dataset is deliberately shaped to tell
 * a story during a live demo:
 *
 * - Three organizations that share records in both directions.
 * - Clients with all six categories populated.
 * - A mix of active, expired, and revoked consents.
 * - A backdated audit trail containing both ALLOWED and DENIED reads, so
 *   the compliance wall is visible in the owner's "Access history" table.
 *
 * Run with `npm run demo:seed` (empty database only) or `npm run demo:reset`
 * (wipes the embedded database first, then reseeds).
 */

const DEMO_PASSWORD = "demo1234";

type OrgKey = "riverside" | "harbor" | "northside";

interface OrgDefinition {
  key: OrgKey;
  name: string;
  email: string;
}

interface SeedConsent {
  org: OrgKey;
  category: Category;
  grantedAt: Date;
  expiresAt?: Date | null;
  revokedAt?: Date | null;
}

interface SeedReadBatch {
  /** The organization doing the reading. */
  org: OrgKey;
  /** When that organization opened the client's detail page. */
  at: Date;
}

interface SeedClient {
  fullName: string;
  owner: OrgKey;
  createdAt: Date;
  records: Record<Category, Record<string, unknown>>;
  consents: SeedConsent[];
  reads: SeedReadBatch[];
  /** Categories the owner saved after intake (one audit row each). */
  writes: Category[];
}

/** A date `days` ago at a fixed local time, to keep the trail readable. */
function daysAgo(days: number, hour = 10, minute = 0): Date {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  date.setDate(date.getDate() - days);
  return date;
}

/** A date `days` in the future at a fixed local time (for live consents). */
function daysFromNow(days: number, hour = 17, minute = 0): Date {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  date.setDate(date.getDate() + days);
  return date;
}

/**
 * Was a consent active at a given moment? Mirrors the production rule in
 * lib/consent.ts, but works against the richer seed definitions so we can
 * generate a historically accurate audit trail.
 */
function consentActiveAt(
  list: SeedConsent[],
  org: OrgKey,
  category: Category,
  at: Date,
): boolean {
  return list.some(
    (c) =>
      c.org === org &&
      c.category === category &&
      c.grantedAt.getTime() <= at.getTime() &&
      (!c.revokedAt || c.revokedAt.getTime() > at.getTime()) &&
      (!c.expiresAt || c.expiresAt.getTime() > at.getTime()),
  );
}

const ORGANIZATIONS: OrgDefinition[] = [
  {
    key: "riverside",
    name: "Riverside Shelter",
    email: "admin@riverside.test",
  },
  {
    key: "harbor",
    name: "Harbor Clinic",
    email: "admin@harbor.test",
  },
  {
    key: "northside",
    name: "Northside Legal Aid",
    email: "admin@northside.test",
  },
];

const CLIENTS: SeedClient[] = [
  {
    fullName: "Maria Delgado",
    owner: "riverside",
    createdAt: daysAgo(60),
    writes: ["contact", "health"],
    records: {
      contact: {
        phone: "555-0142",
        email: "maria.delgado@example.test",
        preferred: "phone",
        safeToLeaveMessage: true,
      },
      housing: {
        status: "temporary",
        type: "emergency shelter",
        address: "Riverside Shelter, 14 Mill St",
        since: "2026-09-12",
        caseworker: "R. Alvarez",
      },
      health: {
        conditions: ["asthma", "hypertension"],
        medications: ["albuterol inhaler"],
        allergies: ["penicillin"],
        primaryCare: "Harbor Community Clinic",
      },
      financial: {
        monthlyIncome: 1150,
        incomeSources: ["part-time retail"],
        benefits: ["SNAP", "Medicaid"],
        notes: "Awaiting housing subsidy decision",
      },
      legal: {
        openCases: ["eviction defense — Case 2026-CV-0412"],
        courtDates: ["2026-12-03"],
        notes: "Riverside referred to Northside Legal Aid",
      },
      other: {
        language: "Spanish (prefers)",
        accessibility: "none",
        notes: "Has two children in the local school",
      },
    },
    consents: [
      // Financial access was granted, used for a while, then revoked.
      {
        org: "harbor",
        category: "financial",
        grantedAt: daysAgo(45),
        revokedAt: daysAgo(20),
      },
      // Housing and health remain active; health has a future expiry.
      { org: "harbor", category: "housing", grantedAt: daysAgo(40) },
      {
        org: "harbor",
        category: "health",
        grantedAt: daysAgo(34),
        expiresAt: daysFromNow(45),
      },
      { org: "northside", category: "legal", grantedAt: daysAgo(28) },
    ],
    reads: [
      // Financial + housing visible; health not yet granted (denied).
      { org: "harbor", at: daysAgo(38) },
      // Legal only for Northside; every other category is denied.
      { org: "northside", at: daysAgo(25) },
      // Financial now denied (revoked); housing + health still allowed.
      { org: "harbor", at: daysAgo(10) },
    ],
  },
  {
    fullName: "Andre Whitfield",
    owner: "riverside",
    createdAt: daysAgo(50),
    writes: ["contact", "housing"],
    records: {
      contact: {
        phone: "555-0177",
        email: "andre.whitfield@example.test",
        preferred: "text",
      },
      housing: {
        status: "transitional",
        type: "shared apartment",
        address: "22 Cedar Ave, Unit 3",
        since: "2026-08-01",
        caseworker: "M. Chen",
      },
      health: {
        conditions: ["type 2 diabetes"],
        medications: ["metformin"],
        allergies: [],
        primaryCare: "Harbor Community Clinic",
      },
      financial: {
        monthlyIncome: 1600,
        incomeSources: ["warehouse shift"],
        benefits: ["SNAP"],
        notes: "Budgeting plan in progress",
      },
      legal: {
        openCases: ["benefits appeal — Case 2026-ADM-1187"],
        courtDates: [],
        notes: "Hearing pending",
      },
      other: {
        language: "English",
        accessibility: "none",
        notes: "Prefers afternoon appointments",
      },
    },
    consents: [
      { org: "harbor", category: "contact", grantedAt: daysAgo(35) },
      { org: "northside", category: "legal", grantedAt: daysAgo(30) },
      // Housing consent expired six days ago, so it no longer grants access.
      {
        org: "northside",
        category: "housing",
        grantedAt: daysAgo(31),
        expiresAt: daysAgo(6),
      },
    ],
    reads: [
      // Before any consent existed: every category denied.
      { org: "northside", at: daysAgo(33) },
      // Contact is the only category Harbor is allowed to see.
      { org: "harbor", at: daysAgo(20) },
      // Legal still allowed; housing now denied because it expired.
      { org: "northside", at: daysAgo(4) },
    ],
  },
  {
    fullName: "Priya Raman",
    owner: "harbor",
    createdAt: daysAgo(45),
    writes: ["contact", "legal"],
    records: {
      contact: {
        phone: "555-0119",
        email: "priya.raman@example.test",
        preferred: "email",
      },
      housing: {
        status: "stable",
        type: "rental",
        address: "98 Birch Ln",
        since: "2025-04-15",
        caseworker: "H. Osei",
      },
      health: {
        conditions: ["migraine"],
        medications: ["sumatriptan"],
        allergies: [],
        primaryCare: "Harbor Community Clinic",
      },
      financial: {
        monthlyIncome: 2400,
        incomeSources: ["bookkeeping"],
        benefits: [],
        notes: "Requested help with tax filing",
      },
      legal: {
        openCases: ["immigration consultation"],
        courtDates: [],
        notes: "Referred to Northside Legal Aid",
      },
      other: {
        language: "English, Tamil",
        accessibility: "none",
        notes: "Consented to share health data with Riverside",
      },
    },
    consents: [
      { org: "riverside", category: "health", grantedAt: daysAgo(25) },
      { org: "northside", category: "legal", grantedAt: daysAgo(20) },
    ],
    reads: [
      // Riverside only sees health; the other five categories are denied.
      { org: "riverside", at: daysAgo(22) },
      // Northside only sees legal.
      { org: "northside", at: daysAgo(15) },
    ],
  },
  {
    fullName: "Tomasz Nowak",
    owner: "northside",
    createdAt: daysAgo(55),
    writes: ["contact", "financial"],
    records: {
      contact: {
        phone: "555-0164",
        email: "tomasz.nowak@example.test",
        preferred: "phone",
      },
      housing: {
        status: "temporary",
        type: "hostel",
        address: "Northside Hostel, 7 King Rd",
        since: "2026-10-02",
        caseworker: "N. Baptiste",
      },
      health: {
        conditions: ["chronic back pain"],
        medications: [],
        allergies: ["latex"],
        primaryCare: "Northside Clinic",
      },
      financial: {
        monthlyIncome: 900,
        incomeSources: ["day labour"],
        benefits: ["General Assistance"],
        notes: "Financial consent later revoked by the client",
      },
      legal: {
        openCases: ["wage claim — Case 2026-LAB-0331"],
        courtDates: ["2026-12-18"],
        notes: "",
      },
      other: {
        language: "Polish (prefers)",
        accessibility: "none",
        notes: "Interpreter required for meetings",
      },
    },
    consents: [
      // Financial consent was revoked; housing was granted afterwards.
      {
        org: "riverside",
        category: "financial",
        grantedAt: daysAgo(30),
        revokedAt: daysAgo(12),
      },
      { org: "riverside", category: "housing", grantedAt: daysAgo(25) },
      { org: "harbor", category: "other", grantedAt: daysAgo(18) },
    ],
    reads: [
      // Financial allowed, housing not granted yet (denied).
      { org: "riverside", at: daysAgo(28) },
      // Other is the only category Harbor can see.
      { org: "harbor", at: daysAgo(14) },
      // Financial now denied (revoked); housing allowed.
      { org: "riverside", at: daysAgo(5) },
    ],
  },
  {
    fullName: "Grace Okafor",
    owner: "riverside",
    createdAt: daysAgo(40),
    writes: ["contact", "housing"],
    records: {
      contact: {
        phone: "555-0155",
        email: "grace.okafor@example.test",
        preferred: "email",
      },
      housing: {
        status: "at risk",
        type: "rental",
        address: "31 Oak St",
        since: "2024-02-20",
        caseworker: "R. Alvarez",
      },
      health: {
        conditions: ["anxiety"],
        medications: [],
        allergies: [],
        primaryCare: "Riverside Family Practice",
      },
      financial: {
        monthlyIncome: 2100,
        incomeSources: ["retail management"],
        benefits: [],
        notes: "No sharing consent on file",
      },
      legal: {
        openCases: [],
        courtDates: [],
        notes: "",
      },
      other: {
        language: "English, Igbo",
        accessibility: "none",
        notes: "Client declined all sharing for now",
      },
    },
    // Grace deliberately has no consents: she demonstrates a fully siloed
    // client. Only her owning org can see her records.
    consents: [],
    reads: [{ org: "riverside", at: daysAgo(39) }],
  },
];

export async function seedDemoData() {
  await runMigrations();

  const existing = await db
    .select({ id: organizations.id })
    .from(organizations)
    .limit(1);

  if (existing.length > 0) {
    throw new Error(
      "Database already contains data. Run `npm run demo:reset` to wipe it and reseed.",
    );
  }

  const orgRows = await db
    .insert(organizations)
    .values(ORGANIZATIONS.map((org) => ({ name: org.name })))
    .returning();

  const orgIdByKey = {} as Record<OrgKey, string>;
  ORGANIZATIONS.forEach((org, index) => {
    orgIdByKey[org.key] = orgRows[index].id;
  });

  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const staffRows = await db
    .insert(staff)
    .values(
      ORGANIZATIONS.map((org) => ({
        orgId: orgIdByKey[org.key],
        email: org.email,
        passwordHash,
        role: "admin" as const,
      })),
    )
    .returning();

  const staffIdByOrg = {} as Record<OrgKey, string>;
  ORGANIZATIONS.forEach((org, index) => {
    staffIdByOrg[org.key] = staffRows[index].id;
  });

  const auditValues: (typeof auditLog.$inferInsert)[] = [];
  let consentCount = 0;

  for (const definition of CLIENTS) {
    const ownerOrgId = orgIdByKey[definition.owner];
    const ownerStaffId = staffIdByOrg[definition.owner];

    const [client] = await db
      .insert(clients)
      .values({
        fullName: definition.fullName,
        ownerOrgId,
        createdAt: definition.createdAt,
        updatedAt: definition.createdAt,
      })
      .returning();

    await db.insert(clientRecords).values(
      CATEGORIES.map((category) => ({
        clientId: client.id,
        category,
        data: definition.records[category],
        updatedByStaffId: ownerStaffId,
        updatedAt: definition.createdAt,
      })),
    );

    if (definition.consents.length > 0) {
      await db.insert(consents).values(
        definition.consents.map((consent) => ({
          clientId: client.id,
          orgId: orgIdByKey[consent.org],
          category: consent.category,
          grantedByStaffId: ownerStaffId,
          grantedAt: consent.grantedAt,
          expiresAt: consent.expiresAt ?? null,
          revokedAt: consent.revokedAt ?? null,
        })),
      );
      consentCount += definition.consents.length;
    }

    // Owner saves audit entries.
    for (const category of definition.writes) {
      auditValues.push({
        actorStaffId: ownerStaffId,
        clientId: client.id,
        orgId: ownerOrgId,
        action: "write",
        category,
        allowed: true,
        createdAt: definition.createdAt,
        metadata: { via: "web" },
      });
    }

    // Consent grant / revoke audit entries. The audit row records the org
    // receiving (or losing) access, matching the live consent routes.
    for (const consent of definition.consents) {
      auditValues.push({
        actorStaffId: ownerStaffId,
        clientId: client.id,
        orgId: orgIdByKey[consent.org],
        action: "consent_grant",
        category: consent.category,
        allowed: true,
        createdAt: consent.grantedAt,
        metadata: { expiresAt: consent.expiresAt?.toISOString() ?? null },
      });

      if (consent.revokedAt) {
        auditValues.push({
          actorStaffId: ownerStaffId,
          clientId: client.id,
          orgId: orgIdByKey[consent.org],
          action: "consent_revoke",
          category: consent.category,
          allowed: true,
          createdAt: consent.revokedAt,
        });
      }
    }

    // Simulated detail-page reads. The live API writes one audit row per
    // category on every open, allowed or denied, so we reproduce that shape.
    for (const batch of definition.reads) {
      CATEGORIES.forEach((category, index) => {
        auditValues.push({
          actorStaffId: staffIdByOrg[batch.org],
          clientId: client.id,
          orgId: orgIdByKey[batch.org],
          action: "read",
          category,
          allowed: consentActiveAt(
            definition.consents,
            batch.org,
            category,
            batch.at,
          ),
          // Stagger by a second so the trail reads like a real request.
          createdAt: new Date(batch.at.getTime() + index * 1000),
          metadata: { via: "web" },
        });
      });
    }
  }

  await db.insert(auditLog).values(auditValues);

  console.log("Demo data seeded.");
  console.log("");
  for (const org of ORGANIZATIONS) {
    console.log(`  ${org.name.padEnd(20)} ${org.email} / ${DEMO_PASSWORD}`);
  }
  console.log("");
  console.log(
    `  ${CLIENTS.length} clients · ${consentCount} consents · ${auditValues.length} audit entries`,
  );
}

// Allow `npm run demo:seed` to invoke this file directly, while reset.ts can
// import seedDemoData() and control when the database handle is closed.
const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  seedDemoData()
    .then(async () => {
      await closeDb();
    })
    .catch(async (err) => {
      console.error(err instanceof Error ? err.message : err);
      await closeDb();
      process.exit(1);
    });
}
