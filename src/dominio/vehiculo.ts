import { z } from "zod";
import { erroresDe, type ErroresCampo } from "./cuenta";
import { formatearKm, type ResultadoValidacion } from "./kilometraje";

export type DatosVehiculo =
  | { tipo: "catalogo"; modeloId: number; anio: number }
  | { tipo: "libre"; marca: string; modelo: string; anio: number };

/** Entero escrito en un formulario: admite punto de miles; vacío no es 0. */
function entero(mensaje: string, min: number, max: number) {
  return z.preprocess(
    (v) => (typeof v === "string" ? (v.trim() === "" ? undefined : Number(v.trim().replace(/\./g, ""))) : v),
    z.number({ error: mensaje }).int({ error: mensaje }).min(min, { error: mensaje }).max(max, { error: mensaje }),
  );
}

const anioMaximo = () => new Date().getFullYear() + 1;
const kilometraje = entero("Ingresá un kilometraje válido.", 0, 2_000_000);

const catalogo = z.object({
  tipo: z.literal("catalogo"),
  modeloId: entero("Elegí un modelo.", 1, 2_147_483_647),
  anio: entero("Elegí el año.", 1900, anioMaximo()),
});

const libre = z.object({
  tipo: z.literal("libre"),
  marca: z.string().trim().min(1, { error: "Ingresá la marca." }).max(60, { error: "Máximo 60 caracteres." }),
  modelo: z.string().trim().min(1, { error: "Ingresá el modelo." }).max(80, { error: "Máximo 80 caracteres." }),
  anio: entero("Ingresá un año válido.", 1900, anioMaximo()),
});

export function parsearVehiculo(
  entrada: Record<string, unknown>,
  conKilometraje: boolean,
): { ok: true; datos: DatosVehiculo; kilometraje: number | null } | { ok: false; errores: ErroresCampo } {
  // Cuatro ramas explícitas: .extend() no se puede llamar sobre una unión de esquemas.
  const esquema =
    entrada.tipo === "libre"
      ? conKilometraje
        ? libre.extend({ kilometraje })
        : libre
      : conKilometraje
        ? catalogo.extend({ kilometraje })
        : catalogo;
  const r = (esquema as z.ZodType<DatosVehiculo & { kilometraje?: number }>).safeParse(entrada);
  if (!r.success) return { ok: false, errores: erroresDe(r.error) };
  const { kilometraje: km, ...datos } = r.data;
  return { ok: true, datos: datos as DatosVehiculo, kilometraje: conKilometraje ? (km ?? null) : null };
}

/** CU-05 4a: el año tiene que estar dentro del rango del modelo. */
export function validarAnioDelModelo(anio: number, desde: number, hasta: number | null): ResultadoValidacion {
  if (anio >= desde && (hasta === null || anio <= hasta)) return { ok: true };
  return {
    ok: false,
    mensaje:
      hasta === null ? `Este modelo está cargado desde ${desde}.` : `Este modelo está cargado de ${desde} a ${hasta}.`,
  };
}

/** Años elegibles, del más nuevo al más viejo. Sin año final, hasta el año siguiente al actual. */
export function aniosDelModelo(desde: number, hasta: number | null, actual: number): number[] {
  const tope = hasta ?? actual + 1;
  return Array.from({ length: tope - desde + 1 }, (_, i) => tope - i);
}

export function nombreVehiculo(v: {
  marca?: string | null;
  modelo?: string | null;
  marcaLibre?: string | null;
  modeloLibre?: string | null;
}): string {
  return `${v.marca ?? v.marcaLibre ?? ""} ${v.modelo ?? v.modeloLibre ?? ""}`.trim();
}

/** "cada 15.000 km o 12 meses": el que ocurra primero. */
export function formatearIntervalo(km: number, meses: number | null): string {
  return meses ? `cada ${formatearKm(km)} km o ${meses} meses` : `cada ${formatearKm(km)} km`;
}
