import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

function crearCliente(url: string | undefined) {
  if (!url) throw new Error("Falta la variable de entorno de conexión a la base de datos.");
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
}

const global = globalThis as unknown as { prismaApp?: PrismaClient };

/** Conexión de ejecución (pooler en modo transacción). Nunca se usa directo: ver conUsuario. */
export const prisma = global.prismaApp ?? crearCliente(process.env.DATABASE_URL);
if (process.env.NODE_ENV !== "production") global.prismaApp = prisma;
