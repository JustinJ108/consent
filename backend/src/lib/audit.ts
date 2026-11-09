import { db } from "../db/client.js";
import { auditLog } from "../db/schema.js";
import type { Category } from "./consent.js";

export interface AuditEntry {
  actorStaffId: string | null;
  clientId: string;
  orgId: string;
  action: "read" | "write" | "consent_grant" | "consent_revoke";
  category?: Category;
  allowed: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Every access decision — allowed or denied — gets written here. This is
 * append-only by convention (no update/delete routes exist for it) so it
 * can stand as a compliance record of who looked at what, and when.
 */
export async function recordAuditEntry(entry: AuditEntry) {
  await db.insert(auditLog).values({
    actorStaffId: entry.actorStaffId,
    clientId: entry.clientId,
    orgId: entry.orgId,
    action: entry.action,
    category: entry.category,
    allowed: entry.allowed,
    metadata: entry.metadata,
  });
}
