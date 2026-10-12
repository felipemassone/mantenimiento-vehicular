/**
 * Motor de reglas (CU-14; RF-08, RF-09, RF-12). Función pura: no lee la base ni el reloj.
 * Las fechas son días calendario como medianoche UTC, igual que las columnas DATE.
 */

/** Fracción del intervalo desde la que un ítem pasa a "próximo a vencer" (RF-08). */
export const UMBRAL_PROXIMO = 0.1;

export type Origen = "registrada" | "supuesta_pendiente" | "supuesta_confirmada" | "supuesta_a_verificar";
export type Estado = "vencido" | "proximo" | "al_dia";
export type Incertidumbre = "a_confirmar" | "verificar_en_taller";

export type ItemDelPlan = {
  itemId: number;
  nombre: string;
  tipo: "reemplazo" | "inspeccion";
  km: number;
  meses: number | null;
};

export type Ejecucion = { itemId: number; origen: Origen; km: number; fecha: Date | null };

export type EntradaMotor = {
  items: ItemDelPlan[];
  intervenciones: Ejecucion[];
  kmAlta: number;
  fechaAlta: Date;
  kmActual: number;
  hoy: Date;
};

export type ItemConEstado = {
  itemId: number;
  nombre: string;
  tipo: "reemplazo" | "inspeccion";
  estado: Estado;
  incertidumbre: Incertidumbre | null;
  kmVence: number;
  fechaVence: Date | null;
  /** Fracción del intervalo que falta en el límite más cercano; 0 o menos si venció. */
  margen: number;
  /** Texto de la fila: "Cambiar · faltan 900 km o vence el 02/05/2027". */
  detalle: string;
};

/** Suma meses de calendario; si el día no existe en el mes de destino, toma el último. */
export function sumarMeses(fecha: Date, meses: number): Date {
  const anio = fecha.getUTCFullYear();
  const mes = fecha.getUTCMonth() + meses;
  const ultimoDia = new Date(Date.UTC(anio, mes + 1, 0)).getUTCDate();
  return new Date(Date.UTC(anio, mes, Math.min(fecha.getUTCDate(), ultimoDia)));
}

/** RF-09: múltiplo del intervalo inmediatamente anterior al km de alta, si el alta lo supera. */
export function kmSupuesto(intervaloKm: number, kmAlta: number): number | null {
  return kmAlta > intervaloKm ? Math.floor(kmAlta / intervaloKm) * intervaloKm : null;
}
