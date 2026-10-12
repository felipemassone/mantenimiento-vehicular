import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const alias = { "@": fileURLToPath(new URL("./src", import.meta.url)) };

export default defineConfig({
  test: {
    // RNF-12: el motor de reglas mantiene al menos 80 % de cobertura.
    coverage: {
      provider: "v8",
      include: ["src/dominio/motor.ts"],
      reporter: ["text", "html"],
      thresholds: { lines: 80, branches: 80, functions: 80, statements: 80 },
    },
    projects: [
      {
        resolve: { alias },
        test: {
          name: "unit",
          include: ["tests/unit/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        resolve: { alias },
        test: {
          name: "integracion",
          include: ["tests/integracion/**/*.test.ts"],
          environment: "node",
          setupFiles: ["tests/integracion/entorno.ts"],
          fileParallelism: false,
          testTimeout: 30_000,
          hookTimeout: 30_000,
        },
      },
    ],
  },
});
