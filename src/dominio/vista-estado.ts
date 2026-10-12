import type { Estado, Incertidumbre, ItemConEstado } from "@/dominio/motor";

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

/** Mockup 04: "1 vencido", "2 próximos", "1 a confirmar" o "Todo al día". */
export function chipsDeResumen(r: { vencidos: number; proximos: number; inciertos: number }): Chip[] {
  const chips: Chip[] = [];
  if (r.vencidos > 0) chips.push({ tipo: "vencido", texto: contar(r.vencidos, "vencido", "vencidos") });
  if (r.proximos > 0) chips.push({ tipo: "proximo", texto: contar(r.proximos, "próximo", "próximos") });
  if (r.inciertos > 0) chips.push({ tipo: "a_confirmar", texto: `${r.inciertos} a confirmar` });
  return chips.length > 0 ? chips : [{ tipo: "al_dia", texto: "Todo al día" }];
}

/** Mockup 06: la línea sobre la lista cuando hay supuestos sin responder. */
export function textoInciertos(items: Pick<ItemConEstado, "incertidumbre">[]): string | null {
  const n = items.filter((i) => i.incertidumbre === "a_confirmar").length;
  if (n === 0) return null;
  return `${contar(n, "ítem", "ítems")} a confirmar. Lo supusimos porque el auto se cargó con más kilómetros que el intervalo.`;
}
