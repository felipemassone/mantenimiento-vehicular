import type { SupabaseClient } from "@supabase/supabase-js";
import { BUCKET, rutaDelComprobante, validarArchivo } from "@/dominio/comprobante";

/**
 * CU-11 en el navegador: valida (2a), sube con la sesión del usuario y devuelve la ruta que manda
 * el formulario. Se llama al enviar, no al elegir el archivo: si el servidor rechaza el envío,
 * borra el archivo, y el próximo envío lo vuelve a subir.
 */
export async function subirComprobante(
  cliente: SupabaseClient,
  usuarioId: string,
  archivo: Blob,
): Promise<{ ok: true; ruta: string } | { ok: false; error: string }> {
  const v = validarArchivo({ tipo: archivo.type, tamano: archivo.size });
  if (!v.ok) return v;
  const ruta = rutaDelComprobante(usuarioId, crypto.randomUUID(), v.tipo);
  const { error } = await cliente.storage.from(BUCKET).upload(ruta, archivo, { contentType: v.tipo, upsert: false });
  return error ? { ok: false, error: "No pudimos subir el comprobante. Probá de nuevo." } : { ok: true, ruta };
}
