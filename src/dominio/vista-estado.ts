import { formatearKm } from "@/dominio/kilometraje";
import type { Cambio, Estado, Incertidumbre, ItemConEstado } from "@/dominio/motor";

export type TipoChip = Estado | Incertidumbre;
export type Chip = { tipo: TipoChip; texto: string };

const TEXTO: Record<TipoChip, string> = {
  vencido: "Vencido",
  proximo: "Próximo",
  al_dia: "Al día",
  a_confirmar: "A confirmar",
  verificar_en_taller: "Verificar en taller",
};

const chip = (tipo: TipoChip): Chip => ({ tipo, texto: TEXTO[tipo] });
const contar = (n: number, singular: string, plural: string) => `${n} ${n === 1 ? singular : plural}`;

/** Spec 3.3: un incierto nunca se ve "al día"; si está vencido o próximo, la marca va al lado. */
export function chipsDeItem(item: Pick<ItemConEstado, "estado" | "incertidumbre">): Chip[] {
  if (item.incertidumbre && item.estado === "al_dia") return [chip(item.incertidumbre)];
  return item.incertidumbre ? [chip(item.estado), chip(item.incertidumbre)] : [chip(item.estado)];
}

/** Mockup 04: "1 vencido", "2 próximos", "1 a confirmar", "1 a verificar" o "Todo al día". */
export function chipsDeResumen(r: { vencidos: number; proximos: number; aConfirmar: number; aVerificar: number }): Chip[] {
  const chips: Chip[] = [];
  if (r.vencidos > 0) chips.push({ tipo: "vencido", texto: contar(r.vencidos, "vencido", "vencidos") });
  if (r.proximos > 0) chips.push({ tipo: "proximo", texto: contar(r.proximos, "próximo", "próximos") });
  if (r.aConfirmar > 0) chips.push({ tipo: "a_confirmar", texto: `${r.aConfirmar} a confirmar` });
  if (r.aVerificar > 0) chips.push({ tipo: "verificar_en_taller", texto: `${r.aVerificar} a verificar` });
  return chips.length > 0 ? chips : [{ tipo: "al_dia", texto: "Todo al día" }];
}

/** Mockup 06: la línea sobre la lista cuando hay supuestos sin responder. */
export function textoInciertos(items: Pick<ItemConEstado, "incertidumbre">[]): string | null {
  const n = items.filter((i) => i.incertidumbre === "a_confirmar").length;
  if (n === 0) return null;
  return `${contar(n, "ítem", "ítems")} a confirmar. Lo supusimos porque el auto se cargó con más kilómetros que el intervalo.`;
}

const ESTADO_EN_TEXTO: Record<Estado, string> = { vencido: "vencido", proximo: "próximo", al_dia: "al día" };

const frase = (cambios: Pick<Cambio, "nombre" | "estado">[]) =>
  `cambió el estado de ${contar(cambios.length, "ítem", "ítems")}: ${cambios
    .map((c) => `${c.nombre}, ahora ${ESTADO_EN_TEXTO[c.estado]}`)
    .join("; ")}.`;

/** Mockup 14: "Con 75.300 km cambió el estado de 1 ítem: Aceite y filtro de aceite, ahora vencido." */
export function textoCambios(km: number, cambios: Pick<Cambio, "nombre" | "estado">[]): string | null {
  if (cambios.length === 0) return null;
  return `Con ${formatearKm(km)} km ${frase(cambios)}`;
}

/** CU-10 paso 7: lo mismo que textoCambios, para un trabajo registrado. */
export function textoCambiosTrabajo(cambios: Pick<Cambio, "nombre" | "estado">[]): string | null {
  if (cambios.length === 0) return null;
  return `Con el trabajo registrado ${frase(cambios)}`;
}

type TrabajoDeItem = { id: string; itemId: number | null; km: number; fecha: Date };

/** Spec 3.1: el trabajo que el motor toma de referencia es el de mayor km; ante un empate, el más reciente. */
export function ultimosTrabajosPorItem(trabajos: TrabajoDeItem[]): Map<number, string> {
  const mejor = new Map<number, TrabajoDeItem>();
  for (const t of trabajos) {
    if (t.itemId === null) continue;
    const a = mejor.get(t.itemId);
    if (!a || t.km > a.km || (t.km === a.km && t.fecha.getTime() > a.fecha.getTime())) mejor.set(t.itemId, t);
  }
  return new Map([...mejor].map(([itemId, t]) => [itemId, t.id]));
}

export type DestinoItem = { href: string; secundario: { href: string; texto: string } | null };

/**
 * La fila de la ficha lleva a lo que pide su estado: con duda, a confirmar el dato; vencido o
 * próximo, a registrar el trabajo; al día, al último trabajo del ítem (o a registrar, si no tiene).
 */
export function destinoDeItem(
  vehiculoId: string,
  item: Pick<ItemConEstado, "itemId" | "estado" | "incertidumbre">,
  ultimoTrabajoId: string | null,
): DestinoItem {
  const registrar = `/vehiculos/${vehiculoId}/registrar?item=${item.itemId}`;
  if (item.incertidumbre) {
    return { href: `/vehiculos/${vehiculoId}/confirmar?item=${item.itemId}`, secundario: { href: registrar, texto: "Registrar trabajo" } };
  }
  if (item.estado === "al_dia" && ultimoTrabajoId) {
    return { href: `/vehiculos/${vehiculoId}/historial/${ultimoTrabajoId}?desde=ficha`, secundario: null };
  }
  return { href: registrar, secundario: null };
}
