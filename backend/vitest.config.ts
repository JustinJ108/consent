import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    env: {
      // Dummy value so importing modules that read env.ts (e.g. lib/auth.ts)
      // doesn't throw in tests that never touch a real database.
      JWT_SECRET: "test-secret",
    },
  },
});
