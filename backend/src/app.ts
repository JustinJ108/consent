import express from "express";
import cors from "cors";
import { env } from "./env.js";
import { authRouter } from "./routes/auth.js";
import { clientsRouter } from "./routes/clients.js";
import { consentsRouter } from "./routes/consents.js";
import { auditLogRouter } from "./routes/auditLog.js";
import { organizationsRouter } from "./routes/organizations.js";

// Split from index.ts so tests can import the app without also starting
// a listener on a real port.
export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: env.CORS_ORIGIN.split(",").map((origin) => origin.trim()),
    }),
  );
  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ ok: true }));

  app.use("/api/auth", authRouter);
  app.use("/api/clients", clientsRouter);
  app.use("/api/consents", consentsRouter);
  app.use("/api/audit-log", auditLogRouter);
  app.use("/api/organizations", organizationsRouter);

  return app;
}

// Vercel's zero-config Express detection looks for a default export from
// app/index/server. Local development uses the named factory in index.ts.
export default createApp();
