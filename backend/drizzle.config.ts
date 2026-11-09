import "dotenv/config";
import { defineConfig } from "drizzle-kit";

// Used only by `npm run db:generate` (schema diffing). Applying migrations
// at runtime is handled by src/db/migrate.ts against embedded PGlite, so no
// live database connection is needed here.
export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://placeholder:placeholder@localhost:5432/placeholder",
  },
});
