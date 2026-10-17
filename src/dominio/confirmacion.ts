import { calcularEstado, type Estado, type ItemDelPlan } from "@/dominio/motor";

export type Supuesto = { itemId: number; origen: "supuesta_pendiente" | "supuesta_a_verificar" };

/** Mockup 13: una fila abierta a la vez. La pedida por "Confirmar dato" o el primer supuesto sin responder. */
export function filaAbierta(supuestos: Supuesto[], pedida: string | undefined): number | null {
  const id = pedida && /^\d+$/.test(pedida) ? Number(pedida) : null;
  if (id !== null && supuestos.some((s) => s.itemId === id)) return id;
  return (supuestos.find((s) => s.origen === "supuesta_pendiente") ?? supuestos[0])?.itemId ?? null;
}

/** Spec 5: la pantalla vuelve a la ficha cuando no queda nada sin responder ("No lo sé" es una respuesta). */
export function terminoLaConfirmacion(supuestos: Supuesto[]): boolean {
  return !supuestos.some((s) => s.origen === "supuesta_pendiente");
}

/** La ficha con el aviso de bienvenida del primer auto (spec 2026-10-16, apartado 3, paso 3). */
const fichaDe = (id: string, bienvenida: boolean) => `/vehiculos/${id}${bienvenida ? "?bienvenida=1" : ""}`;

/** CU-05: si el alta creó supuestos, se confirman antes de ver la ficha. */
export function destinoDelAlta(id: string, conSupuestos: boolean, primero = false): string {
  return conSupuestos ? `/vehiculos/${id}/confirmar?desde=alta` : fichaDe(id, primero);
}

/**
 * Spec 5: después de una respuesta, vuelve a la ficha si terminó; si no, sigue en la pantalla sin `?item=`,
 * para que la fila pedida (ya respondida) no se vuelva a abrir.
 */
export function destinoTrasResponder(id: string, deAlta: boolean, termino: boolean, primero = false): string {
  if (termino) return fichaDe(id, deAlta && primero);
  return deAlta ? `/vehiculos/${id}/confirmar?desde=alta` : `/vehiculos/${id}/confirmar`;
}

type TipoItem = ItemDelPlan["tipo"];

/** Spec 2026-10-16, apartado 2: la pregunta dice el km supuesto y si era un cambio o una revisión. */
export function preguntaDelSupuesto(tipo: TipoItem, km: string): string {
  return `¿Hiciste ${tipo === "reemplazo" ? "el cambio" : "la revisión"} cerca de los ${km} km?`;
}

/** En una inspección, revisar sin cambiar también es haberlo hecho. */
export function aclaracionDelSupuesto(tipo: TipoItem): string | null {
  return tipo === "inspeccion" ? "Si lo revisaron y estaba bien, también cuenta." : null;
}

/** CU-06 2b: qué pasa al responder "No lo sé", dicho antes de tocarlo. */
export function textoNoLoSe(km: string): string {
  return `Si no lo sabés, seguimos contando desde los ${km} km y te lo marcamos para verificar en el taller.`;
}

/**
 * Cómo quedaría el ítem con el dato que se está cargando. Usa el motor con una ejecución
 * confirmada, así la vista previa no puede decir otra cosa que la ficha. El estado va aparte
 * porque la pantalla 21 lo muestra como chip, arriba del texto.
 */
export function vistaPrevia(e: {
  item: ItemDelPlan;
  km: number;
  fecha: Date;
  kmActual: number;
  hoy: Date;
}): { estado: Estado; texto: string } {
  const [i] = calcularEstado({
    items: [e.item],
    intervenciones: [{ itemId: e.item.itemId, origen: "supuesta_confirmada", km: e.km, fecha: e.fecha }],
    kmAlta: e.kmActual,
    fechaAlta: e.hoy,
    kmActual: e.kmActual,
    hoy: e.hoy,
  });
  return { estado: i.estado, texto: `Con ese dato: ${i.detalle.split(" · ")[1]}.` };
}
