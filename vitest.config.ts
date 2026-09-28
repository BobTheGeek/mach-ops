import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // 10,000-seed property sweeps per generator are slow but deliberate.
    testTimeout: 60_000,
  },
});
