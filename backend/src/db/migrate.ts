import { fileURLToPath, pathToFileURL } from "node:url";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { migrate as migrateNeon } from "drizzle-orm/neon-http/migrator";
import { db, closeDb, usingEmbeddedDb } from "./client.js";
import { env } from "../env.js";

const migrationsFolder = fileURLToPath(new URL("../../drizzle", import.meta.url));

export async function runMigrations() {
  if (env.DATABASE_URL) {
    await migrateNeon(db, { migrationsFolder });
  } else {
    await migratePglite(
      db as unknown as Parameters<typeof migratePglite>[0],
      { migrationsFolder },
    );
  }
}

// Allow `npm run db:migrate` to invoke this file directly, while still
// letting src/index.ts import runMigrations() and reuse the same db handle.
const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  runMigrations()
    .then(async () => {
      console.log(
        `Migrations applied (${usingEmbeddedDb ? "embedded PGlite" : "hosted Postgres"}).`,
      );
      await closeDb();
    })
    .catch(async (err) => {
      console.error(err);
      await closeDb();
      process.exit(1);
    });
}
