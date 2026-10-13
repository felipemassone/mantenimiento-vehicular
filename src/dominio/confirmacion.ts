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

/** CU-05: si el alta creó supuestos, se confirman antes de ver la ficha. */
export function destinoDelAlta(id: string, conSupuestos: boolean): string {
  return conSupuestos ? `/vehiculos/${id}/confirmar?desde=alta` : `/vehiculos/${id}`;
}

/**
 * Spec 5: después de una respuesta, vuelve a la ficha si terminó; si no, sigue en la pantalla sin `?item=`,
 * para que la fila pedida (ya respondida) no se vuelva a abrir.
 */
export function destinoTrasResponder(id: string, deAlta: boolean, termino: boolean): string {
  if (termino) return `/vehiculos/${id}`;
  return deAlta ? `/vehiculos/${id}/confirmar?desde=alta` : `/vehiculos/${id}/confirmar`;
}
