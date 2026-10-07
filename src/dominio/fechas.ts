const ZONA = "America/Argentina/Buenos_Aires";
const diaArgentino = new Intl.DateTimeFormat("en-CA", {
  timeZone: ZONA,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Día calendario de Argentina como medianoche UTC (lo que guarda una columna DATE). */
export function fechaDeHoy(ahora: Date = new Date()): Date {
  return new Date(`${diaArgentino.format(ahora)}T00:00:00Z`);
}

/** dd/mm/aaaa a partir de una fecha DATE (medianoche UTC). */
export function formatearFecha(fecha: Date): string {
  const d = String(fecha.getUTCDate()).padStart(2, "0");
  const m = String(fecha.getUTCMonth() + 1).padStart(2, "0");
  return `${d}/${m}/${fecha.getUTCFullYear()}`;
}
