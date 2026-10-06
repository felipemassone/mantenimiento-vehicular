export type ResultadoValidacion = { ok: true } | { ok: false; mensaje: string };

const formato = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });

export function formatearKm(km: number): string {
  return formato.format(km);
}

/** RF-07: el odómetro no retrocede. `ultima` es null cuando el vehículo no tiene lecturas. */
export function validarNuevaLectura(ultima: number | null, nueva: number): ResultadoValidacion {
  if (!Number.isInteger(nueva) || nueva < 0) {
    return { ok: false, mensaje: "Ingresá un kilometraje válido." };
  }
  if (ultima !== null && nueva < ultima) {
    return {
      ok: false,
      mensaje: `No puede ser menor a ${formatearKm(ultima)} km, la última lectura.`,
    };
  }
  return { ok: true };
}
