import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Las cuentas de la prueba de carga se reconocen por el correo, para borrarlas después. */
export const PREFIJO = "carga-k6-";
export const SESIONES = "tests/carga/sesiones.json";

export function admin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.SUPABASE_SECRET_KEY;
  if (!url || !clave) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY.");
  return createClient(url, clave, { auth: { autoRefreshToken: false, persistSession: false } });
}
