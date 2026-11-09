import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  // When set (e.g. a Neon connection string), the API uses a hosted Postgres
  // instead of the embedded PGlite database. Use the pooled connection string
  // on serverless hosts like Vercel.
  DATABASE_URL: z.string().min(1).optional(),
  // Directory used by the embedded Postgres (PGlite) for on-disk storage.
  // No external database or Docker required for local development.
  PGLITE_DIR: z.string().default("./.data/pglite"),
  JWT_SECRET: z.string().min(1).default("dev-secret-change-me"),
  PORT: z.coerce.number().default(4000),
  // Origins allowed to call the API directly (the Next dev server proxies
  // /api, so this mainly matters for curl / third-party clients).
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  PGLITE_DIR: process.env.PGLITE_DIR,
  JWT_SECRET: process.env.JWT_SECRET,
  PORT: process.env.PORT,
  CORS_ORIGIN: process.env.CORS_ORIGIN,
});
