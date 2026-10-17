import { PrismaPg } from "@prisma/adapter-pg";
import { attachDatabasePool } from "@vercel/functions";
import { Pool } from "pg";
import { PrismaClient } from "@/generated/prisma/client";

function crearCliente(url: string | undefined) {
  if (!url) throw new Error("Falta la variable de entorno de conexión a la base de datos.");
  // El pooler del plan gratuito acepta 200 clientes en total. Cada instancia de la función usa
  // pocas conexiones (una transacción por pedido) y cierra las ociosas a los 5 s; attachDatabasePool
  // mantiene viva la instancia hasta cerrarlas, para que una instancia suspendida no las retenga
  // (PS-07: con 50 usuarios, el pooler llegó a 200 y rechazó consultas con EMAXCONN).
  const pool = new Pool({ connectionString: url, max: 5, idleTimeoutMillis: 5_000 });
  attachDatabasePool(pool);
  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

const global = globalThis as unknown as { prismaApp?: PrismaClient };

/** Conexión de ejecución (pooler en modo transacción). Nunca se usa directo: ver conUsuario. */
export const prisma = global.prismaApp ?? crearCliente(process.env.DATABASE_URL);
if (process.env.NODE_ENV !== "production") global.prismaApp = prisma;
