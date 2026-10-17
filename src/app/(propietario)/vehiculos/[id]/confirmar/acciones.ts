"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { confirmarSupuesto, corregirSupuesto, marcarAVerificar, supuestosDelVehiculo } from "@/datos/estado";
import { exigirClaims } from "@/datos/sesion";
import { listarVehiculos } from "@/datos/vehiculos";
import { destinoTrasResponder, terminoLaConfirmacion } from "@/dominio/confirmacion";
import type { ErroresCampo } from "@/dominio/cuenta";

export type EstadoRespuesta = { errores?: ErroresCampo; valores?: { fecha?: string; km?: string } };

/** CU-06: "Sí, se hizo" (fecha), "Fue en otro momento" (km + fecha) o "No lo sé". */
export async function responderSupuesto(
  vehiculoId: string,
  itemId: number,
  deAlta: boolean,
  _previo: EstadoRespuesta,
  datos: FormData,
): Promise<EstadoRespuesta> {
  const claims = await exigirClaims();
  const respuesta = datos.get("respuesta");
  const fecha = datos.get("fecha");
  const km = datos.get("km");
  const r =
    respuesta === "no_lo_se"
      ? await marcarAVerificar(claims, vehiculoId, itemId)
      : respuesta === "corregir"
        ? await corregirSupuesto(claims, vehiculoId, itemId, km, fecha)
        : await confirmarSupuesto(claims, vehiculoId, itemId, fecha);
  if (!r.ok) {
    return { errores: r.errores, valores: { fecha: String(fecha ?? ""), km: String(km ?? "") } };
  }
  revalidatePath(`/vehiculos/${vehiculoId}`);
  revalidatePath("/vehiculos");
  const [quedan, vehiculos] = await Promise.all([supuestosDelVehiculo(claims, vehiculoId), listarVehiculos(claims)]);
  const termino = !quedan || terminoLaConfirmacion(quedan.supuestos);
  redirect(destinoTrasResponder(vehiculoId, deAlta, termino, vehiculos.length === 1));
}
