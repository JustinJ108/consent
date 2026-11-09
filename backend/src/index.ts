import { createApp } from "./app.js";
import { env } from "./env.js";
import { runMigrations } from "./db/migrate.js";
import { pglite } from "./db/client.js";

async function main() {
  await runMigrations();

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    console.log(`consent-api listening on http://localhost:${env.PORT}`);
    console.log(`  data dir: ${env.PGLITE_DIR}`);
  });

  const shutdown = async () => {
    server.close();
    await pglite.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
