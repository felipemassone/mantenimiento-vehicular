import type { SupabaseClient } from "@supabase/supabase-js";
import { BUCKET, rutaPropia } from "@/dominio/comprobante";
import type { Cambio } from "@/dominio/motor";
import { conUsuario, type ClaimsUsuario } from "./cliente-usuario";
import { editarIntervencion, eliminarIntervencion, registrarIntervencion } from "./intervenciones";
import type { Resultado } from "./vehiculos";

/*
 * Archivos del bucket, siempre con la sesión del usuario (`cliente`): la RLS de Storage limita
 * todo a su carpeta. En las acciones, el cliente es el de `@/lib/supabase/server`.
 */

/**
 * La base no deja borrar storage.objects directo: se borra por la API. Un error no corta la
 * operación: el archivo queda huérfano en la carpeta del usuario (límite aceptado, spec 4).
 */
async function borrarArchivos(cliente: SupabaseClient, rutas: string[]): Promise<void> {
  if (rutas.length === 0) return;
  const { error } = await cliente.storage.from(BUCKET).remove(rutas);
  if (error) console.error(`[comprobantes] no se pudieron borrar ${rutas.length} archivos: ${error.message}`);
}

/** El archivo de un envío fallido se borra solo si ningún trabajo lo usa: un reenvío no deja a otro sin imagen. */
async function borrarSiHuerfano(claims: ClaimsUsuario, cliente: SupabaseClient, ruta: string | null): Promise<void> {
  if (!ruta) return;
  const enUso = await conUsuario(claims, (tx) => tx.comprobante.findUnique({ where: { rutaArchivo: ruta }, select: { id: true } }));
  if (!enUso) await borrarArchivos(cliente, [ruta]);
}

/** CU-10 con CU-11: si el trabajo no se guarda, el archivo subido se borra (postcondición de CU-11). */
export async function registrarTrabajo(
  claims: ClaimsUsuario,
  cliente: SupabaseClient,
  vehiculoId: string,
  entrada: Record<string, unknown>,
  ahora: Date = new Date(),
): Promise<Resultado<{ id: string; cambios: Cambio[] }>> {
  const ruta = rutaPropia(entrada.comprobante, claims.sub);
  try {
    const r = await registrarIntervencion(claims, vehiculoId, entrada, ahora);
    if (!r.ok) await borrarSiHuerfano(claims, cliente, ruta);
    return r;
  } catch (e) {
    await borrarSiHuerfano(claims, cliente, ruta);
    throw e;
  }
}

/** CU-12 con CU-11: el archivo reemplazado o quitado se borra después de confirmar el cambio. */
export async function editarTrabajo(
  claims: ClaimsUsuario,
  cliente: SupabaseClient,
  vehiculoId: string,
  intervencionId: string,
  entrada: Record<string, unknown>,
  ahora: Date = new Date(),
): Promise<Resultado<{ cambios: Cambio[]; rutaAnterior: string | null }>> {
  const ruta = rutaPropia(entrada.comprobante, claims.sub);
  try {
    const r = await editarIntervencion(claims, vehiculoId, intervencionId, entrada, ahora);
    if (r.ok && r.valor.rutaAnterior) await borrarArchivos(cliente, [r.valor.rutaAnterior]);
    if (!r.ok) await borrarSiHuerfano(claims, cliente, ruta);
    return r;
  } catch (e) {
    await borrarSiHuerfano(claims, cliente, ruta);
    throw e;
  }
}

/** CU-12 1a: la fila del comprobante se va en cascada; el archivo, después. */
export async function eliminarTrabajo(
  claims: ClaimsUsuario,
  cliente: SupabaseClient,
  vehiculoId: string,
  intervencionId: string,
  ahora: Date = new Date(),
): Promise<Resultado<{ cambios: Cambio[] }>> {
  const r = await eliminarIntervencion(claims, vehiculoId, intervencionId, ahora);
  if (!r.ok) return r;
  if (r.valor.rutaComprobante) await borrarArchivos(cliente, [r.valor.rutaComprobante]);
  return { ok: true, valor: { cambios: r.valor.cambios } };
}

/** CU-13 paso 3: enlace firmado de 60 segundos; la imagen nunca es pública (RF-15). */
export async function enlaceDelComprobante(cliente: SupabaseClient, ruta: string): Promise<string | null> {
  const { data, error } = await cliente.storage.from(BUCKET).createSignedUrl(ruta, 60);
  return error ? null : data.signedUrl;
}

/** RF-04: borrar el usuario de Auth no borra sus archivos; se vacía su carpeta antes. */
export async function borrarCarpeta(cliente: SupabaseClient, usuarioId: string): Promise<boolean> {
  for (;;) {
    const { data, error } = await cliente.storage.from(BUCKET).list(usuarioId, { limit: 100 });
    if (error) return false;
    if (data.length === 0) return true;
    const borrados = await cliente.storage.from(BUCKET).remove(data.map((o) => `${usuarioId}/${o.name}`));
    // Sin error pero sin borrar nada (la RLS lo impidió): cortar en vez de repetir para siempre.
    if (borrados.error || borrados.data.length === 0) return false;
  }
}
