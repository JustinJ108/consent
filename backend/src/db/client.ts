import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema.js";
import { env } from "../env.js";

// Both drivers expose the same Drizzle query API, so routes stay identical.
// We use the Neon type as the shared shape and cast the embedded driver to it.
export type AppDb = NeonHttpDatabase<typeof schema>;

let close: () => Promise<void> = async () => {};

let db: AppDb;

if (process.env.VERCEL && !env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is required on Vercel: embedded PGlite needs a persistent filesystem.",
  );
}

if (env.DATABASE_URL) {
  // Hosted Postgres (Neon). The HTTP driver is stateless, which suits
  // serverless hosts like Vercel where connections cannot be kept open.
  const sql = neon(env.DATABASE_URL);
  db = drizzleNeon(sql, { schema }) as unknown as AppDb;
} else {
  // PGlite is a full Postgres engine compiled to WASM, persisted to a local
  // directory. Using it here keeps the "hand-written API against a real
  // Postgres" story intact while making the app runnable with zero external
  // services (no Docker, no database server to install).
  mkdirSync(dirname(env.PGLITE_DIR), { recursive: true });
  const pglite = new PGlite(env.PGLITE_DIR);
  db = drizzlePglite(pglite, { schema }) as unknown as AppDb;
  close = () => pglite.close();
}

export { db };
export const usingEmbeddedDb = !env.DATABASE_URL;

export function closeDb(): Promise<void> {
  return close();
}
