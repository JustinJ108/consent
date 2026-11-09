import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "./schema.js";
import { env } from "../env.js";

// PGlite creates the data directory itself but expects the parent to exist.
mkdirSync(dirname(env.PGLITE_DIR), { recursive: true });

// PGlite is a full Postgres engine compiled to WASM, persisted to a local
// directory. Using it here keeps the "hand-written API against a real
// Postgres" story intact while making the app runnable with zero external
// services (no Docker, no database server to install).
export const pglite = new PGlite(env.PGLITE_DIR);

export const db = drizzle(pglite, { schema });
