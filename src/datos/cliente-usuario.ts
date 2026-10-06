import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "./prisma";

export type ClaimsUsuario = { sub: string; role: "authenticated"; email?: string };
export type TxUsuario = Prisma.TransactionClient;

/**
 * Ejecuta `fn` en nombre del usuario: una transacción que adopta el rol `authenticated`
 * y carga los claims, de modo que auth.uid() y las políticas RLS se aplican (RNF-04).
 * Los claims tienen que salir de un token verificado en el servidor, nunca del navegador.
 */
export async function conUsuario<T>(
  claims: ClaimsUsuario,
  fn: (tx: TxUsuario) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT set_config('request.jwt.claims', ${JSON.stringify(claims)}, true)`;
    await tx.$executeRawUnsafe("SET LOCAL ROLE authenticated");
    return fn(tx);
  });
}
