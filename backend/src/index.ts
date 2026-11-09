import { pathToFileURL } from "node:url";
import { createApp } from "./app.js";
import { env } from "./env.js";
import { runMigrations } from "./db/migrate.js";
import { closeDb, usingEmbeddedDb } from "./db/client.js";

// Vercel's zero-config Express detection uses this default export. Local
// development starts the listener below instead.
export default createApp();

async function main() {
  await runMigrations();

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    console.log(`consent-api listening on http://localhost:${env.PORT}`);
    console.log(
      usingEmbeddedDb
        ? `  data dir: ${env.PGLITE_DIR}`
        : "  database: hosted Postgres (DATABASE_URL)",
    );
  });

  const shutdown = async () => {
    server.close();
    await closeDb();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

// Only start the server (and run migrations) when this file is executed
// directly, not when Vercel imports it as a serverless function.
const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
