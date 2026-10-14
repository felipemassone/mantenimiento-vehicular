"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { editarTrabajo, eliminarTrabajo, registrarTrabajo } from "@/datos/comprobantes";
import { exigirClaims } from "@/datos/sesion";
import type { ErroresCampo } from "@/dominio/cuenta";
import { rutaFichaConCambios } from "@/dominio/vista-trabajo";
import { createClient } from "@/lib/supabase/server";

/** React 19 reinicia el formulario después de la acción: `valores` vuelve a llenar los campos. */
export type EstadoTrabajo = { errores?: ErroresCampo; valores?: Record<string, string> };

function revalidar(vehiculoId: string) {
  revalidatePath(`/vehiculos/${vehiculoId}`, "layout");
  revalidatePath("/vehiculos");
}

/** CU-10 (trabajoId null) o CU-12; el comprobante ya llega subido, como ruta (CU-11). */
export async function guardarTrabajo(
  vehiculoId: string,
  trabajoId: string | null,
  _previo: EstadoTrabajo,
  datos: FormData,
): Promise<EstadoTrabajo> {
  const claims = await exigirClaims();
  const entrada: Record<string, string> = {};
  for (const [clave, valor] of datos) if (typeof valor === "string") entrada[clave] = valor;
  const cliente = await createClient();
  const r =
    trabajoId === null
      ? await registrarTrabajo(claims, cliente, vehiculoId, entrada)
      : await editarTrabajo(claims, cliente, vehiculoId, trabajoId, entrada);
  if (!r.ok) {
    // Un envío rechazado borra el archivo subido: el próximo lo vuelve a subir.
    const valores = { ...entrada };
    delete valores.comprobante;
    return { errores: r.errores, valores };
  }
  revalidar(vehiculoId);
  // CU-10 paso 7: la ficha avisa qué ítems cambiaron de estado.
  redirect(trabajoId === null ? rutaFichaConCambios(vehiculoId, r.valor.cambios) : `/vehiculos/${vehiculoId}/historial/${trabajoId}`);
}

/** CU-12 1a. */
export async function borrarTrabajo(vehiculoId: string, trabajoId: string): Promise<EstadoTrabajo> {
  const claims = await exigirClaims();
  const r = await eliminarTrabajo(claims, await createClient(), vehiculoId, trabajoId);
  if (!r.ok) return { errores: r.errores };
  revalidar(vehiculoId);
  redirect(`/vehiculos/${vehiculoId}/historial`);
}
