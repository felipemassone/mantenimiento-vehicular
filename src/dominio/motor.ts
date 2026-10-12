/**
 * Motor de reglas (CU-14; RF-08, RF-09, RF-12). Función pura: no lee la base ni el reloj.
 * Las fechas son días calendario como medianoche UTC, igual que las columnas DATE.
 */

import { formatearFecha } from "@/dominio/fechas";
import { formatearKm } from "@/dominio/kilometraje";

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

/**
 * RF-09: múltiplo del intervalo inmediatamente anterior al km de alta, si el alta lo supera.
 * "Anterior" es estricto: con un alta justo en un múltiplo se supone el previo, no "recién hecho".
 */
export function kmSupuesto(intervaloKm: number, kmAlta: number): number | null {
  return kmAlta > intervaloKm ? Math.ceil(kmAlta / intervaloKm - 1) * intervaloKm : null;
}

const DIA_MS = 86_400_000;
const CIERTAS: Origen[] = ["registrada", "supuesta_confirmada"];

type Referencia = { km: number; fecha: Date | null; incertidumbre: Incertidumbre | null };

function dias(desde: Date, hasta: Date): number {
  return Math.round((hasta.getTime() - desde.getTime()) / DIA_MS);
}

/** Spec 3.1: ejecución cierta de mayor km, o el supuesto, o uno nuevo, o km 0 y la fecha de alta. */
function referenciaDe(item: ItemDelPlan, entrada: EntradaMotor): Referencia {
  const delItem = entrada.intervenciones.filter((e) => e.itemId === item.itemId);
  const ciertas = delItem.filter((e) => CIERTAS.includes(e.origen));
  if (ciertas.length > 0) {
    // Mayor km; ante un empate, la fecha más reciente (no el orden en que llegan de la base).
    const ultima = ciertas.reduce((a, b) => (b.km > a.km || (b.km === a.km && (b.fecha?.getTime() ?? 0) > (a.fecha?.getTime() ?? 0)) ? b : a));
    return { km: ultima.km, fecha: ultima.fecha, incertidumbre: null };
  }
  const supuesto = delItem[0];
  if (supuesto) {
    const incertidumbre = supuesto.origen === "supuesta_a_verificar" ? "verificar_en_taller" : "a_confirmar";
    return { km: supuesto.km, fecha: null, incertidumbre };
  }
  const km = kmSupuesto(item.km, entrada.kmAlta);
  if (km !== null) return { km, fecha: null, incertidumbre: "a_confirmar" };
  return { km: 0, fecha: entrada.fechaAlta, incertidumbre: null };
}

function detalleDe(
  item: ItemDelPlan,
  ref: Referencia,
  estado: Estado,
  kmVence: number,
  fechaVence: Date | null,
  margenKm: number,
  kmActual: number,
): string {
  const accion = item.tipo === "reemplazo" ? "Cambiar" : "Revisar";
  let dato: string;
  if (estado === "al_dia" && ref.incertidumbre) {
    dato = `supuesto a los ${formatearKm(ref.km)} km`;
  } else if (estado === "vencido") {
    dato = margenKm <= 0 ? `venció a los ${formatearKm(kmVence)} km` : `venció el ${formatearFecha(fechaVence!)}`;
  } else {
    const fecha = fechaVence ? ` o vence el ${formatearFecha(fechaVence)}` : "";
    dato = `faltan ${formatearKm(kmVence - kmActual)} km${fecha}`;
  }
  return `${accion} · ${dato}`;
}

function evaluar(item: ItemDelPlan, entrada: EntradaMotor): ItemConEstado {
  if (!(item.km > 0)) throw new Error(`El ítem ${item.itemId} tiene un intervalo en km no válido.`);
  const ref = referenciaDe(item, entrada);
  const kmVence = ref.km + item.km;
  const fechaVence = item.meses !== null && ref.fecha !== null ? sumarMeses(ref.fecha, item.meses) : null;
  const margenKm = (kmVence - entrada.kmActual) / item.km;
  const margenFecha =
    fechaVence && ref.fecha ? dias(entrada.hoy, fechaVence) / dias(ref.fecha, fechaVence) : Number.POSITIVE_INFINITY;
  const margen = Math.min(margenKm, margenFecha);
  const estado: Estado = margen <= 0 ? "vencido" : margen <= UMBRAL_PROXIMO ? "proximo" : "al_dia";
  return {
    itemId: item.itemId,
    nombre: item.nombre,
    tipo: item.tipo,
    estado,
    incertidumbre: ref.incertidumbre,
    kmVence,
    fechaVence,
    margen,
    detalle: detalleDe(item, ref, estado, kmVence, fechaVence, margenKm, entrada.kmActual),
  };
}

/** Spec 3.4: vencidos, próximos, verificar en taller, a confirmar y al día. */
function rango(item: ItemConEstado): number {
  if (item.estado === "vencido") return 0;
  if (item.estado === "proximo") return 1;
  if (item.incertidumbre === "verificar_en_taller") return 2;
  if (item.incertidumbre === "a_confirmar") return 3;
  return 4;
}

function porUrgencia(a: ItemConEstado, b: ItemConEstado): number {
  return rango(a) - rango(b) || a.margen - b.margen || a.nombre.localeCompare(b.nombre, "es");
}

/** CU-14: estado de cada ítem del plan, ordenado por urgencia (RF-12). */
export function calcularEstado(entrada: EntradaMotor): ItemConEstado[] {
  return entrada.items.map((item) => evaluar(item, entrada)).sort(porUrgencia);
}

/** Spec 4.2: supuestos que el cálculo tiene que guardar (ítems sin ninguna ejecución). */
export function supuestosFaltantes(
  entrada: Pick<EntradaMotor, "items" | "intervenciones" | "kmAlta">,
): { itemId: number; km: number }[] {
  return entrada.items.flatMap((item) => {
    if (entrada.intervenciones.some((e) => e.itemId === item.itemId)) return [];
    const km = kmSupuesto(item.km, entrada.kmAlta);
    return km === null ? [] : [{ itemId: item.itemId, km }];
  });
}

/** Chips de la lista de vehículos (mockup 04). */
export function resumen(items: ItemConEstado[]): { vencidos: number; proximos: number; inciertos: number } {
  return {
    vencidos: items.filter((i) => i.estado === "vencido").length,
    proximos: items.filter((i) => i.estado === "proximo").length,
    inciertos: items.filter((i) => i.incertidumbre !== null).length,
  };
}

export type Cambio = { itemId: number; nombre: string; estado: Estado };

/** CU-08 paso 7: ítems cuyo estado cambió entre dos cálculos, en el orden del segundo. */
export function cambiosDeEstado(antes: ItemConEstado[], despues: ItemConEstado[]): Cambio[] {
  const previo = new Map(antes.map((i) => [i.itemId, i.estado]));
  return despues
    .filter((i) => previo.get(i.itemId) !== i.estado)
    .map(({ itemId, nombre, estado }) => ({ itemId, nombre, estado }));
}
