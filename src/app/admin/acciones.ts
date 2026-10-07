"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  actualizarModelo,
  agregarItem,
  crearModelo,
  descartarBorrador,
  editarIntervalo,
  publicarPlan,
  quitarItem,
} from "@/datos/catalogo";
import { exigirRol } from "@/datos/sesion";
import { parsearIntervalo, parsearItem, parsearModelo } from "@/dominio/catalogo";
import type { ErroresCampo } from "@/dominio/cuenta";

export type EstadoAdmin = { errores?: ErroresCampo; ok?: true; mensaje?: string };
const admin = () => exigirRol("administrador_catalogo");

/** CU-15: alta (id null) o edición. */
export async function guardarModelo(id: number | null, _previo: EstadoAdmin, datos: FormData): Promise<EstadoAdmin> {
  const claims = await admin();
  const p = parsearModelo(Object.fromEntries(datos));
  if (!p.ok) return { errores: p.errores };
  const r = id === null ? await crearModelo(claims, p.datos) : await actualizarModelo(claims, id, p.datos);
  if (!r.ok) return { errores: r.errores };
  revalidatePath("/admin/modelos");
  redirect(`/admin/modelos/${id ?? r.valor}`);
}

/** CU-16 paso 3. */
export async function sumarItem(modeloId: number, _previo: EstadoAdmin, datos: FormData): Promise<EstadoAdmin> {
  const claims = await admin();
  const p = parsearItem(Object.fromEntries(datos));
  if (!p.ok) return { errores: p.errores };
  const r = await agregarItem(claims, modeloId, p.datos);
  if (!r.ok) return { errores: r.errores };
  revalidatePath(`/admin/modelos/${modeloId}`);
  return { ok: true };
}

/** CU-16 3a. */
export async function cambiarIntervalo(
  modeloId: number,
  itemId: number,
  _previo: EstadoAdmin,
  datos: FormData,
): Promise<EstadoAdmin> {
  const claims = await admin();
  const p = parsearIntervalo(Object.fromEntries(datos));
  if (!p.ok) return { errores: p.errores };
  const r = await editarIntervalo(claims, modeloId, itemId, p.datos);
  if (!r.ok) return { errores: r.errores };
  revalidatePath(`/admin/modelos/${modeloId}`);
  return { ok: true };
}

/** CU-16 3a. */
export async function sacarItem(modeloId: number, itemId: number): Promise<void> {
  const claims = await admin();
  await quitarItem(claims, modeloId, itemId);
  revalidatePath(`/admin/modelos/${modeloId}`);
}

/** CU-17. */
export async function publicar(modeloId: number): Promise<EstadoAdmin> {
  const claims = await admin();
  const r = await publicarPlan(claims, modeloId);
  if (!r.ok) return { errores: r.errores };
  revalidatePath(`/admin/modelos/${modeloId}`);
  revalidatePath("/admin/modelos");
  return { ok: true, mensaje: `Versión ${r.valor} publicada. Los propietarios la ven desde su próxima consulta.` };
}

export async function descartar(modeloId: number): Promise<void> {
  const claims = await admin();
  await descartarBorrador(claims, modeloId);
  revalidatePath(`/admin/modelos/${modeloId}`);
}
