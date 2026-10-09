import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

// ARCHIVO_ENTORNO=.env.produccion.local apunta la CLI y el seed a producción.
config({ path: process.env.ARCHIVO_ENTORNO ?? ".env.local", quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // La CLI (migraciones y seed) usa el pooler en modo sesión.
    url: env("DIRECT_URL"),
  },
});
