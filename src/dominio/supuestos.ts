import type { ErroresCampo } from "@/dominio/cuenta";
import { formatearKm } from "@/dominio/kilometraje";

export type Fecha = { ok: true; fecha: Date } | { ok: false; error: string };

/** Fecha de un input type="date" (aaaa-mm-dd), como día calendario en medianoche UTC. */
export function leerFecha(valor: unknown, hoy: Date): Fecha {
  const texto = typeof valor === "string" ? valor.trim() : "";
  if (!texto) return { ok: false, error: "Ingresá la fecha." };
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto);
  const fecha = m ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))) : null;
  if (!fecha || fecha.toISOString().slice(0, 10) !== texto) return { ok: false, error: "Ingresá una fecha válida." };
  if (fecha.getTime() > hoy.getTime()) return { ok: false, error: "La fecha no puede ser posterior a hoy." };
  return { ok: true, fecha };
}

/** CU-06 paso 2: confirmar el supuesto exige la fecha (decisión del 4/10/2026). */
export function validarConfirmacion(entrada: {
  fecha: unknown;
  hoy: Date;
}): { ok: true; fecha: Date } | { ok: false; errores: ErroresCampo } {
  const f = leerFecha(entrada.fecha, entrada.hoy);
  return f.ok ? { ok: true, fecha: f.fecha } : { ok: false, errores: { fecha: f.error } };
}

/** CU-06 2a y 2d: km y fecha reales; el km no puede superar la lectura actual. */
export function validarCorreccion(entrada: {
  km: unknown;
  fecha: unknown;
  kmActual: number;
  hoy: Date;
}): { ok: true; km: number; fecha: Date } | { ok: false; errores: ErroresCampo } {
  const texto = typeof entrada.km === "string" ? entrada.km.replace(/\./g, "").trim() : "";
  const km = /^\d+$/.test(texto) ? Number(texto) : NaN;
  const errores: ErroresCampo = {};
  if (!Number.isSafeInteger(km)) errores.km = "Ingresá un kilometraje válido.";
  else if (km > entrada.kmActual) errores.km = `No puede superar ${formatearKm(entrada.kmActual)} km, la lectura actual.`;
  const f = leerFecha(entrada.fecha, entrada.hoy);
  if (!f.ok) errores.fecha = f.error;
  return Object.keys(errores).length > 0 || !f.ok ? { ok: false, errores } : { ok: true, km, fecha: f.fecha };
}
