import { z } from "zod";
import { erroresDe, type ErroresCampo } from "./cuenta";

export type DatosModelo = { marca: string; nombre: string; anioDesde: number; anioHasta: number | null };
export type DatosItem = { nombre: string; tipo: "reemplazo" | "inspeccion"; km: number; meses: number | null };

/** Entero de formulario: admite punto de miles; vacío es `undefined`. */
const aNumero = (v: unknown) =>
  typeof v === "string" ? (v.trim() === "" ? undefined : Number(v.trim().replace(/\./g, ""))) : v;

/** Entero en un rango, con un único mensaje para cualquier error. */
const enteroEntre = (mensaje: string, min: number, max: number) =>
  z.number({ error: mensaje }).int({ error: mensaje }).min(min, { error: mensaje }).max(max, { error: mensaje });

const anioMax = new Date().getFullYear() + 1;

const esquemaModelo = z
  .object({
    marca: z.string().trim().min(1, { error: "Ingresá la marca." }).max(60, { error: "Máximo 60 caracteres." }),
    nombre: z.string().trim().min(1, { error: "Ingresá el modelo." }).max(80, { error: "Máximo 80 caracteres." }),
    anioDesde: z.preprocess(aNumero, enteroEntre("Ingresá el año inicial.", 1950, anioMax)),
    anioHasta: z.preprocess(aNumero, enteroEntre("Ingresá un año válido o dejalo vacío.", 1950, anioMax).optional()),
  })
  .refine((d) => d.anioHasta === undefined || d.anioDesde <= d.anioHasta, {
    error: "El año final no puede ser anterior al inicial.",
    path: ["anioHasta"],
  });

const km = z.preprocess(aNumero, enteroEntre("Ingresá un intervalo en km mayor que cero.", 1, 1_000_000));
const meses = z.preprocess(aNumero, enteroEntre("Ingresá meses mayores que cero o dejalo vacío.", 1, 240).optional());

const esquemaIntervalo = z.object({ km, meses });
const esquemaItem = z.object({
  nombre: z.string().trim().min(1, { error: "Ingresá el nombre del ítem." }).max(80, { error: "Máximo 80 caracteres." }),
  tipo: z.enum(["reemplazo", "inspeccion"], { error: "Elegí si se cambia o se revisa." }),
  km,
  meses,
});

type Parseo<T> = { ok: true; datos: T } | { ok: false; errores: ErroresCampo };

export function parsearModelo(entrada: Record<string, unknown>): Parseo<DatosModelo> {
  const r = esquemaModelo.safeParse(entrada);
  return r.success
    ? { ok: true, datos: { ...r.data, anioHasta: r.data.anioHasta ?? null } }
    : { ok: false, errores: erroresDe(r.error) };
}

export function parsearItem(entrada: Record<string, unknown>): Parseo<DatosItem> {
  const r = esquemaItem.safeParse(entrada);
  return r.success
    ? { ok: true, datos: { ...r.data, meses: r.data.meses ?? null } }
    : { ok: false, errores: erroresDe(r.error) };
}

export function parsearIntervalo(entrada: Record<string, unknown>): Parseo<{ km: number; meses: number | null }> {
  const r = esquemaIntervalo.safeParse(entrada);
  return r.success
    ? { ok: true, datos: { km: r.data.km, meses: r.data.meses ?? null } }
    : { ok: false, errores: erroresDe(r.error) };
}

/** Dos rangos de años se superponen; `null` es un año final abierto. */
export function rangosSeSuperponen(a: [number, number | null], b: [number, number | null]): boolean {
  const finA = a[1] ?? Number.POSITIVE_INFINITY;
  const finB = b[1] ?? Number.POSITIVE_INFINITY;
  return a[0] <= finB && b[0] <= finA;
}

/** RF-20: al menos un ítem, intervalos positivos y sin ítems repetidos. */
export function validarPublicacion(items: { nombre: string; km: number; meses: number | null }[]): string[] {
  if (items.length === 0) return ["El plan tiene que tener al menos un ítem."];
  const errores: string[] = [];
  const vistos = new Set<string>();
  for (const it of items) {
    const nombre = it.nombre.trim();
    if (vistos.has(nombre.toLowerCase())) errores.push(`“${nombre}” está repetido.`);
    vistos.add(nombre.toLowerCase());
    if (!(it.km > 0) || (it.meses !== null && !(it.meses > 0))) {
      errores.push(`“${nombre}” tiene un intervalo en km no válido.`);
    }
  }
  return errores;
}
