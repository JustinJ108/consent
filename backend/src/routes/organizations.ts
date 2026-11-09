import { Router } from "express";
import { ne } from "drizzle-orm";
import { db } from "../db/client.js";
import { organizations } from "../db/schema.js";
import { authenticate } from "../middleware/authenticate.js";

export const organizationsRouter = Router();
organizationsRouter.use(authenticate);

// Lists the other participating organizations, so the owning org can pick
// who to grant a client's consent to. The caller's own org is excluded.
organizationsRouter.get("/", async (req, res) => {
  const rows = await db
    .select({ id: organizations.id, name: organizations.name })
    .from(organizations)
    .where(ne(organizations.id, req.staff!.orgId));

  res.json(rows);
});
