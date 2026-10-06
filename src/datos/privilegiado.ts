import { PrismaPg } from "@prisma/adapter-pg";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Permisos de administrador: SIN RLS. Solo lo importan el seed, la eliminación de cuenta
 * (src/app/cuenta/acciones.ts) y las pruebas. ESLint lo impide en cualquier otro archivo.
 */
export const prismaPrivilegiado = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL }),
});

let admin: SupabaseClient | undefined;

export function supabaseAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.SUPABASE_SECRET_KEY;
  if (!url || !clave) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY.");
  admin ??= createClient(url, clave, { auth: { autoRefreshToken: false, persistSession: false } });
  return admin;
}
