import { Router } from "express";
import { z } from "zod";
import { db } from "../db/client.js";
import { organizations, staff } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { hashPassword, verifyPassword, signToken } from "../lib/auth.js";
import { authenticate } from "../middleware/authenticate.js";

export const authRouter = Router();

const registerSchema = z.object({
  orgName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

// Bootstraps a brand new organization with its first admin user.
// Joining an existing org is a separate, invite-based flow — not built yet.
authRouter.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { orgName, email, password } = parsed.data;

  const existing = await db.query.staff.findFirst({ where: eq(staff.email, email) });
  if (existing) {
    return res.status(409).json({ error: "Email already registered" });
  }

  const [org] = await db.insert(organizations).values({ name: orgName }).returning();
  const passwordHash = await hashPassword(password);
  const [admin] = await db
    .insert(staff)
    .values({ orgId: org.id, email, passwordHash, role: "admin" })
    .returning();

  const token = signToken({ staffId: admin.id, orgId: org.id, role: "admin" });
  res.status(201).json({ token, org: { id: org.id, name: org.name } });
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { email, password } = parsed.data;

  const member = await db.query.staff.findFirst({ where: eq(staff.email, email) });
  if (!member || !(await verifyPassword(password, member.passwordHash))) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const token = signToken({ staffId: member.id, orgId: member.orgId, role: member.role });
  res.json({ token });
});

// Returns the caller's identity plus their organization. The web client
// uses this on load to restore a session from a stored token.
authRouter.get("/me", authenticate, async (req, res) => {
  const member = await db.query.staff.findFirst({
    where: eq(staff.id, req.staff!.staffId),
  });
  if (!member) {
    return res.status(401).json({ error: "Session no longer valid" });
  }

  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, member.orgId),
  });

  res.json({
    staffId: member.id,
    email: member.email,
    role: member.role,
    org: { id: member.orgId, name: org?.name ?? "" },
  });
});
