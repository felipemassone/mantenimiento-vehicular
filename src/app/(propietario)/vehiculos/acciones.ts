"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirClaims } from "@/datos/sesion";
import { actualizarVehiculo, crearVehiculo, eliminarVehiculo, registrarLectura } from "@/datos/vehiculos";
import type { ErroresCampo } from "@/dominio/cuenta";
import { parsearVehiculo } from "@/dominio/vehiculo";

export type EstadoVehiculo = { errores?: ErroresCampo; ok?: true };

/** CU-05. */
export async function agregarVehiculo(_previo: EstadoVehiculo, datos: FormData): Promise<EstadoVehiculo> {
  const claims = await exigirClaims();
  const p = parsearVehiculo(Object.fromEntries(datos), true);
  if (!p.ok) return { errores: p.errores };
  const r = await crearVehiculo(claims, p.datos, p.kilometraje!);
  if (!r.ok) return { errores: r.errores };
  revalidatePath("/vehiculos");
  redirect(`/vehiculos/${r.valor}`);
}

/** CU-07. */
export async function editarVehiculo(id: string, _previo: EstadoVehiculo, datos: FormData): Promise<EstadoVehiculo> {
  const claims = await exigirClaims();
  const p = parsearVehiculo(Object.fromEntries(datos), false);
  if (!p.ok) return { errores: p.errores };
  const r = await actualizarVehiculo(claims, id, p.datos);
  if (!r.ok) return { errores: r.errores };
  revalidatePath("/vehiculos");
  redirect(`/vehiculos/${id}`);
}

/** CU-07 1a. */
export async function borrarVehiculo(id: string): Promise<void> {
  const claims = await exigirClaims();
  await eliminarVehiculo(claims, id);
  revalidatePath("/vehiculos");
  redirect("/vehiculos");
}

/** CU-08. Un campo vacío llega como NaN y validarNuevaLectura lo rechaza. */
export async function actualizarKilometraje(id: string, _previo: EstadoVehiculo, datos: FormData): Promise<EstadoVehiculo> {
  const claims = await exigirClaims();
  const texto = String(datos.get("kilometraje") ?? "").trim().replace(/\./g, "");
  const km = texto === "" ? Number.NaN : Number(texto);
  const r = await registrarLectura(claims, id, km);
  if (!r.ok) return { errores: r.errores };
  revalidatePath(`/vehiculos/${id}`);
  revalidatePath("/vehiculos");
  return { ok: true };
}
