import { Router } from "express";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { clients, clientRecords, consents } from "../db/schema.js";
import { authenticate } from "../middleware/authenticate.js";
import { hasActiveConsent, CATEGORIES, type Category } from "../lib/consent.js";
import { recordAuditEntry } from "../lib/audit.js";

export const clientsRouter = Router();
clientsRouter.use(authenticate);

const createClientSchema = z.object({
  fullName: z.string().min(1),
});

// Creates a new client master record, owned by the caller's org.
clientsRouter.post("/", async (req, res) => {
  const parsed = createClientSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const [client] = await db
    .insert(clients)
    .values({ fullName: parsed.data.fullName, ownerOrgId: req.staff!.orgId })
    .returning();

  res.status(201).json(client);
});

// Lists clients visible to the caller: ones their org owns, plus ones
// they hold at least one active consent for. No category data here —
// just enough to pick a client to open.
clientsRouter.get("/", async (req, res) => {
  const orgId = req.staff!.orgId;

  const owned = await db.query.clients.findMany({ where: eq(clients.ownerOrgId, orgId) });

  const consentedClientIds = await db
    .selectDistinct({ clientId: consents.clientId })
    .from(consents)
    .where(eq(consents.orgId, orgId));

  const consentedClients =
    consentedClientIds.length > 0
      ? await db.query.clients.findMany({
          where: (c, { inArray }) =>
            inArray(
              c.id,
              consentedClientIds.map((row) => row.clientId),
            ),
        })
      : [];

  const byId = new Map([...owned, ...consentedClients].map((c) => [c.id, c]));
  res.json([...byId.values()]);
});

// Returns the client's master info plus every category the caller's org
// currently has active consent to see. Every category access — allowed
// or denied — is written to the audit log.
clientsRouter.get("/:id", async (req, res) => {
  const clientId = req.params.id;
  const orgId = req.staff!.orgId;

  const client = await db.query.clients.findFirst({ where: eq(clients.id, clientId) });
  if (!client) {
    return res.status(404).json({ error: "Client not found" });
  }

  const isOwner = client.ownerOrgId === orgId;
  const clientConsents = await db.query.consents.findMany({
    where: and(eq(consents.clientId, clientId), eq(consents.orgId, orgId)),
  });

  const records = await db.query.clientRecords.findMany({
    where: eq(clientRecords.clientId, clientId),
  });

  const visibleRecords: Record<string, unknown> = {};
  for (const category of CATEGORIES) {
    const allowed = isOwner || hasActiveConsent(clientConsents, orgId, category);
    await recordAuditEntry({
      actorStaffId: req.staff!.staffId,
      clientId,
      orgId,
      action: "read",
      category,
      allowed,
    });
    if (allowed) {
      const record = records.find((r) => r.category === category);
      if (record) visibleRecords[category] = record.data;
    }
  }

  res.json({
    id: client.id,
    fullName: client.fullName,
    isOwner,
    records: visibleRecords,
  });
});

const upsertRecordSchema = z.object({
  category: z.enum(CATEGORIES as [Category, ...Category[]]),
  data: z.record(z.unknown()),
});

// Writes a category record. Restricted to the owning org for now — a
// sharing org only ever gets read access via consent. Letting a
// consented org contribute writes back would need its own approval
// workflow, which is a deliberate v2, not an oversight.
clientsRouter.put("/:id/records", async (req, res) => {
  const clientId = req.params.id;
  const orgId = req.staff!.orgId;

  const parsed = upsertRecordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const client = await db.query.clients.findFirst({ where: eq(clients.id, clientId) });
  if (!client) {
    return res.status(404).json({ error: "Client not found" });
  }

  const allowed = client.ownerOrgId === orgId;
  await recordAuditEntry({
    actorStaffId: req.staff!.staffId,
    clientId,
    orgId,
    action: "write",
    category: parsed.data.category,
    allowed,
  });

  if (!allowed) {
    return res.status(403).json({ error: "Only the owning organization can write client records" });
  }

  const existing = await db.query.clientRecords.findFirst({
    where: and(eq(clientRecords.clientId, clientId), eq(clientRecords.category, parsed.data.category)),
  });

  if (existing) {
    const [updated] = await db
      .update(clientRecords)
      .set({ data: parsed.data.data, updatedByStaffId: req.staff!.staffId, updatedAt: new Date() })
      .where(eq(clientRecords.id, existing.id))
      .returning();
    return res.json(updated);
  }

  const [created] = await db
    .insert(clientRecords)
    .values({
      clientId,
      category: parsed.data.category,
      data: parsed.data.data,
      updatedByStaffId: req.staff!.staffId,
    })
    .returning();
  res.status(201).json(created);
});
