import type { ErroresCampo } from "@/dominio/cuenta";
import { leerFecha } from "@/dominio/supuestos";

export type Comunes = { fecha: Date; km: number; taller: string | null; costo: string | null };
export type DatosIntervencion = ({ tipo: "catalogo"; itemId: number } | { tipo: "libre"; descripcion: string }) & Comunes;
type Validado<T> = { ok: true; datos: T } | { ok: false; errores: ErroresCampo };

const texto = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const COSTO_MAXIMO = 10_000_000_000;
const ERROR_COSTO = "Ingresá un costo válido, por ejemplo 85.000 o 85.000,50.";

/** "85.000,50" → "85000.50"; acepta puntos de miles bien puestos y hasta 2 decimales con coma. */
function leerCosto(valor: unknown): { ok: true; costo: string | null } | { ok: false; error: string } {
  const t = texto(valor).replace(/^\$\s*/, "");
  if (!t) return { ok: true, costo: null };
  if (!/^(\d{1,3}(\.\d{3})+|\d+)(,\d{1,2})?$/.test(t)) return { ok: false, error: ERROR_COSTO };
  const costo = t.replace(/\./g, "").replace(",", ".");
  if (Number(costo) >= COSTO_MAXIMO) return { ok: false, error: "El costo no puede superar $ 9.999.999.999,99." };
  return { ok: true, costo };
}

function leerKm(valor: unknown): { ok: true; km: number } | { ok: false; error: string } {
  const t = texto(valor).replace(/\./g, "");
  if (!t) return { ok: false, error: "Ingresá el kilometraje." };
  if (!/^\d+$/.test(t) || !Number.isSafeInteger(Number(t))) return { ok: false, error: "Ingresá un kilometraje válido." };
  if (Number(t) === 0) return { ok: false, error: "Ingresá un kilometraje mayor a 0." };
  return { ok: true, km: Number(t) };
}

/** Fecha, km, taller y costo: lo común a registrar (CU-10) y editar (CU-12). */
function validarComunes(entrada: Record<string, unknown>, hoy: Date, errores: ErroresCampo): Comunes | null {
  const f = leerFecha(entrada.fecha, hoy);
  if (!f.ok) errores.fecha = f.error;
  const k = leerKm(entrada.km);
  if (!k.ok) errores.km = k.error;
  const taller = texto(entrada.taller);
  if (taller.length > 120) errores.taller = "El taller no puede superar 120 caracteres.";
  const c = leerCosto(entrada.costo);
  if (!c.ok) errores.costo = c.error;
  return f.ok && k.ok && c.ok && taller.length <= 120
    ? { fecha: f.fecha, km: k.km, taller: taller || null, costo: c.costo }
    : null;
}

/** CU-10 pasos 3 y 4 (RF-13, RF-14). */
export function validarIntervencion(entrada: Record<string, unknown>, hoy: Date): Validado<DatosIntervencion> {
  const errores: ErroresCampo = {};
  const tipo = entrada.tipo;
  let parte: { tipo: "catalogo"; itemId: number } | { tipo: "libre"; descripcion: string } | null = null;
  if (tipo === "catalogo") {
    const id = texto(entrada.itemId);
    if (/^\d+$/.test(id) && Number(id) > 0) parte = { tipo: "catalogo", itemId: Number(id) };
    else errores.itemId = "Elegí el trabajo del plan.";
  } else if (tipo === "libre") {
    const descripcion = texto(entrada.descripcion);
    if (!descripcion) errores.descripcion = "Describí el trabajo.";
    else if (descripcion.length > 200) errores.descripcion = "La descripción no puede superar 200 caracteres.";
    else parte = { tipo: "libre", descripcion };
  } else {
    errores.tipo = "Elegí el tipo de trabajo.";
  }
  const comunes = validarComunes(entrada, hoy, errores);
  return parte && comunes ? { ok: true, datos: { ...parte, ...comunes } } : { ok: false, errores };
}

/** CU-12 paso 4: los mismos criterios que el registro, sin ítem ni descripción. */
export function validarEdicion(entrada: Record<string, unknown>, hoy: Date): Validado<Comunes> {
  const errores: ErroresCampo = {};
  const comunes = validarComunes(entrada, hoy, errores);
  return comunes ? { ok: true, datos: comunes } : { ok: false, errores };
}
