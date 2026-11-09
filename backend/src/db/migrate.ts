import { fileURLToPath, pathToFileURL } from "node:url";
import { migrate } from "drizzle-orm/pglite/migrator";
import { db, pglite } from "./client.js";

const migrationsFolder = fileURLToPath(new URL("../../drizzle", import.meta.url));

export async function runMigrations() {
  await migrate(db, { migrationsFolder });
}

// Allow `npm run db:migrate` to invoke this file directly, while still
// letting src/index.ts import runMigrations() and reuse the same db handle.
const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  runMigrations()
    .then(async () => {
      console.log("Migrations applied.");
      await pglite.close();
    })
    .catch(async (err) => {
      console.error(err);
      await pglite.close();
      process.exit(1);
    });
}
