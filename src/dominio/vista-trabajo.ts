import { formatearKm } from "@/dominio/kilometraje";

const miles = (entero: string) => entero.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

/** "85000.5" (Decimal de la base) → "85.000,50"; sin centavos, sin decimales. */
function costoArgentino(costo: string): string {
  const [entero, decimales = ""] = costo.split(".");
  const centavos = decimales.padEnd(2, "0").slice(0, 2);
  return centavos === "00" ? miles(entero) : `${miles(entero)},${centavos}`;
}

/** DESIGN.md: dinero como "$ 85.000". */
export function formatearCosto(costo: string): string {
  return `$ ${costoArgentino(costo)}`;
}

/** El costo guardado, en el formato que vuelve a leer el formulario (leerCosto). */
export function costoParaCampo(costo: string | null): string {
  return costo === null ? "" : costoArgentino(costo);
}

/** aaaa-mm-dd de una fecha DATE (medianoche UTC), para <input type="date">. */
export function fechaParaCampo(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

const MB = 1024 * 1024;

/** "850 KB" o "1,2 MB" (pantalla 15). */
export function formatearTamano(bytes: number): string {
  if (bytes < MB) return `${Math.max(1, Math.ceil(bytes / 1024))} KB`;
  return `${(bytes / MB).toFixed(1).replace(".", ",")} MB`;
}

/** Mockup 16: "62.400 km · Lubricentro San Martín". */
export function detalleDelTrabajo(t: { km: number; taller: string | null }): string {
  return t.taller ? `${formatearKm(t.km)} km · ${t.taller}` : `${formatearKm(t.km)} km`;
}

/** CU-10 paso 7: ids de ítem del parámetro `cambios` de la ficha; lo demás se ignora. */
export function leerCambios(valor: unknown): number[] {
  if (typeof valor !== "string") return [];
  const ids = valor
    .split(",")
    .filter((p) => /^\d+$/.test(p))
    .map(Number)
    .filter((n) => n > 0 && Number.isSafeInteger(n));
  return [...new Set(ids)].slice(0, 50);
}

/** Después de registrar: la ficha, con los ítems que cambiaron para el aviso. */
export function rutaFichaConCambios(vehiculoId: string, cambios: { itemId: number }[]): string {
  const ficha = `/vehiculos/${vehiculoId}`;
  return cambios.length === 0 ? ficha : `${ficha}?cambios=${cambios.map((c) => c.itemId).join(",")}`;
}
