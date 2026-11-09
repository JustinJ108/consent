import { Router } from "express";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { clients, consents } from "../db/schema.js";
import { authenticate } from "../middleware/authenticate.js";
import { CATEGORIES, type Category } from "../lib/consent.js";
import { recordAuditEntry } from "../lib/audit.js";

export const consentsRouter = Router();
consentsRouter.use(authenticate);

const grantSchema = z.object({
  clientId: z.string().uuid(),
  orgId: z.string().uuid(),
  category: z.enum(CATEGORIES as [Category, ...Category[]]),
  expiresAt: z.string().datetime().nullable().optional(),
});

// Records a client's consent for `orgId` to read one category of their
// data. In this scaffold, consent is recorded by a caseworker at the
// owning org — presumably with the client present during intake — not
// self-served by the client directly. A client-facing consent portal
// with its own identity verification is future work, not this v1.
consentsRouter.post("/", async (req, res) => {
  const parsed = grantSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { clientId, orgId, category, expiresAt } = parsed.data;

  const client = await db.query.clients.findFirst({ where: eq(clients.id, clientId) });
  if (!client) {
    return res.status(404).json({ error: "Client not found" });
  }
  if (client.ownerOrgId !== req.staff!.orgId) {
    return res.status(403).json({ error: "Only the owning organization can grant consent for this client" });
  }

  const [consent] = await db
    .insert(consents)
    .values({
      clientId,
      orgId,
      category,
      grantedByStaffId: req.staff!.staffId,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    })
    .returning();

  await recordAuditEntry({
    actorStaffId: req.staff!.staffId,
    clientId,
    orgId,
    action: "consent_grant",
    category,
    allowed: true,
  });

  res.status(201).json(consent);
});

// Revokes a consent. Only the owning org (the one that granted it) can
// revoke it. Revocation is immediate: hasActiveConsent() stops counting
// it from this point on.
consentsRouter.delete("/:id", async (req, res) => {
  const consent = await db.query.consents.findFirst({ where: eq(consents.id, req.params.id) });
  if (!consent) {
    return res.status(404).json({ error: "Consent not found" });
  }

  const client = await db.query.clients.findFirst({ where: eq(clients.id, consent.clientId) });
  if (!client || client.ownerOrgId !== req.staff!.orgId) {
    return res.status(403).json({ error: "Only the owning organization can revoke this consent" });
  }

  const [revoked] = await db
    .update(consents)
    .set({ revokedAt: new Date() })
    .where(eq(consents.id, consent.id))
    .returning();

  await recordAuditEntry({
    actorStaffId: req.staff!.staffId,
    clientId: consent.clientId,
    orgId: consent.orgId,
    action: "consent_revoke",
    category: consent.category,
    allowed: true,
  });

  res.json(revoked);
});

consentsRouter.get("/client/:clientId", async (req, res) => {
  const client = await db.query.clients.findFirst({ where: eq(clients.id, req.params.clientId) });
  if (!client || client.ownerOrgId !== req.staff!.orgId) {
    return res.status(403).json({ error: "Only the owning organization can list this client's consents" });
  }

  const rows = await db.query.consents.findMany({ where: eq(consents.clientId, req.params.clientId) });
  res.json(rows);
});
