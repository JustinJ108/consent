import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
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
  PGLITE_DIR: process.env.PGLITE_DIR,
  JWT_SECRET: process.env.JWT_SECRET,
  PORT: process.env.PORT,
  CORS_ORIGIN: process.env.CORS_ORIGIN,
});
