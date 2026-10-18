/** Línea que deja la ficha en los logs de Vercel (src/app/(propietario)/vehiculos/[id]/page.tsx). */
const LINEA = /^\[RNF-02\] ficha pedido=(\d+) ms datos=(\d+) ms$/;

export function leerLinea(mensaje: string): { pedido: number; datos: number } | null {
  const m = LINEA.exec(mensaje.trim());
  return m ? { pedido: Number(m[1]), datos: Number(m[2]) } : null;
}

export type Resumen = { n: number; promedio: number; mediana: number; p95: number; minimo: number; maximo: number };

/** Percentil por rango más cercano: el menor valor que deja por debajo al menos el p % de los datos. */
function percentil(ordenados: number[], p: number): number {
  return ordenados[Math.max(0, Math.ceil((p / 100) * ordenados.length) - 1)];
}

export function resumir(valores: number[]): Resumen | null {
  if (valores.length === 0) return null;
  const o = [...valores].sort((a, b) => a - b);
  const medio = Math.floor(o.length / 2);
  return {
    n: o.length,
    promedio: o.reduce((s, v) => s + v, 0) / o.length,
    mediana: o.length % 2 ? o[medio] : (o[medio - 1] + o[medio]) / 2,
    p95: percentil(o, 95),
    minimo: o[0],
    maximo: o[o.length - 1],
  };
}

/** Duración en el formato de k6 ("5m", "30s", "1m30s") a milisegundos. */
export function duracionMs(texto: string): number {
  const m = /^(?:(\d+)m)?(?:(\d+)s)?$/.exec(texto.trim());
  if (!m || (!m[1] && !m[2])) throw new Error(`Duración no reconocida: ${texto}`);
  return (Number(m[1] ?? 0) * 60 + Number(m[2] ?? 0)) * 1000;
}
