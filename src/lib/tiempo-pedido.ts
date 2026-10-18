/**
 * RNF-02 (PS-07): proxy.ts anota en este encabezado cuándo llegó el pedido; la ficha registra
 * en los logs de Vercel el tiempo total en el servidor, una vez enviada la respuesta. El valor
 * que mande el navegador se pisa en el proxy.
 */
export const INICIO_PEDIDO = "x-inicio-pedido";

/** Milisegundos desde que llegó el pedido; null si el proxy no lo anotó. */
export function msDesde(inicio: string | null, ahora: number = Date.now()): number | null {
  const n = Number(inicio);
  return inicio && Number.isFinite(n) && n > 0 ? ahora - n : null;
}

/** El resultado de `fn` y cuántos milisegundos tardó. */
export async function medir<T>(fn: () => Promise<T>): Promise<[T, number]> {
  const inicio = performance.now();
  const valor = await fn();
  return [valor, Math.round(performance.now() - inicio)];
}
