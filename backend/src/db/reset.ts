import { rmSync } from "node:fs";
import { resolve } from "node:path";
import { sql } from "drizzle-orm";
import { env } from "../env.js";

/**
 * `npm run demo:reset`
 *
 * Wipes the database and reseeds the demo dataset. This is the "start from a
 * clean slate" button for client demos: it guarantees the same organizations,
 * clients, consents, and audit trail every time.
 *
 * - Embedded PGlite: removes the data directory, then reseeds.
 * - Hosted Postgres (DATABASE_URL, e.g. Neon): truncates the tables, then
 *   reseeds. Point DATABASE_URL at the production database to reset a hosted
 *   demo; be careful, this deletes all data.
 */

if (env.DATABASE_URL) {
  const { db, closeDb } = await import("./client.js");
  const { seedDemoData } = await import("./seed.js");

  try {
    await db.execute(
      sql`TRUNCATE TABLE audit_log, consents, client_records, clients, staff, organizations RESTART IDENTITY CASCADE`,
    );
    console.log("Truncated hosted database tables.");
    await seedDemoData();
  } finally {
    await closeDb();
  }
} else {
  const dataDir = resolve(process.cwd(), env.PGLITE_DIR);

  if (dataDir === resolve(process.cwd()) || dataDir === "/") {
    throw new Error(`Refusing to delete unsafe data directory: ${dataDir}`);
  }

  rmSync(dataDir, { recursive: true, force: true });
  console.log(`Removed ${dataDir}`);

  // The seed module is imported dynamically *after* the directory is removed,
  // because importing db/client.ts opens the database immediately.
  const { seedDemoData } = await import("./seed.js");
  const { closeDb } = await import("./client.js");

  try {
    await seedDemoData();
  } finally {
    await closeDb();
  }
}
