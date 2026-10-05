import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Reglas de capas (spec, apartado 3). En la configuración plana, el último bloque que define
// una regla para un archivo reemplaza a los anteriores: cada bloque repite todos sus patrones.
const PRIVILEGIADO = {
  group: ["@/datos/privilegiado", "**/datos/privilegiado"],
  message:
    "Los permisos de administrador solo se usan en el seed, al eliminar la cuenta y en las pruebas (spec, apartado 3, regla 3).",
};
const BASE = {
  group: ["@/generated/*", "@prisma/*", "**/generated/prisma/*"],
  message: "Solo src/datos accede a la base (spec, apartado 3, regla 2).",
};
const FRAMEWORKS = {
  group: ["next", "next/*", "@supabase/*", "@/datos/*", "react", "react-dom"],
  message: "dominio/ no depende de frameworks ni de la base (spec, apartado 3, regla 1).",
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "src/generated/**",
  ]),
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/datos/privilegiado.ts", "src/app/cuenta/acciones.ts"],
    rules: { "no-restricted-imports": ["error", { patterns: [PRIVILEGIADO] }] },
  },
  {
    files: ["src/app/**/*.{ts,tsx}"],
    ignores: ["src/app/cuenta/acciones.ts"],
    rules: { "no-restricted-imports": ["error", { patterns: [PRIVILEGIADO, BASE] }] },
  },
  {
    files: ["src/dominio/**/*.ts"],
    rules: { "no-restricted-imports": ["error", { patterns: [PRIVILEGIADO, BASE, FRAMEWORKS] }] },
  },
]);

export default eslintConfig;
