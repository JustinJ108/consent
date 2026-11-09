import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { auditLog, clients } from "../db/schema.js";
import { authenticate, requireRole } from "../middleware/authenticate.js";

export const auditLogRouter = Router();
auditLogRouter.use(authenticate, requireRole("admin"));

// Compliance view: every access decision recorded for a given client,
// newest first. Only the owning org's admins can pull this — an org
// that merely holds consent has no visibility into who else looked.
auditLogRouter.get("/client/:clientId", async (req, res) => {
  const client = await db.query.clients.findFirst({ where: eq(clients.id, req.params.clientId) });
  if (!client || client.ownerOrgId !== req.staff!.orgId) {
    return res.status(403).json({ error: "Only the owning organization can view this client's audit log" });
  }

  const rows = await db.query.auditLog.findMany({
    where: eq(auditLog.clientId, req.params.clientId),
    orderBy: (row, { desc }) => [desc(row.createdAt)],
  });
  res.json(rows);
});
