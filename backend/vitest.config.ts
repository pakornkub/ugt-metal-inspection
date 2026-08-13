import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    env: { SKIP_ENV_VALIDATION: "1" },
    include: ["src/**/*.{test,spec}.ts"],
    exclude: ["node_modules", "dist"],
    reporters: process.env.CI ? ["verbose", "junit"] : ["verbose"],
    outputFile: {
      junit: "test-results/junit.xml",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/**"],
      exclude: ["**/*.d.ts", "**/*.config.*"],
    },
  },
});
