/** Bucket privado de Supabase Storage (spec, apartado 4). */
export const BUCKET = "comprobantes";
/** RF-15: 5 MB, igual que el límite del bucket y la restricción comprobante_tamano. */
export const TAMANO_MAXIMO = 5 * 1024 * 1024;

const EXTENSION = { "image/jpeg": "jpg", "image/png": "png" } as const;
export type TipoComprobante = keyof typeof EXTENSION;

export type CambioComprobante = { accion: "mantener" } | { accion: "quitar" } | { accion: "poner"; ruta: string };

/** CU-11 2a: antes de subir, y otra vez en el servidor con los metadatos de Storage. */
export function validarArchivo(a: {
  tipo: string;
  tamano: number;
}): { ok: true; tipo: TipoComprobante } | { ok: false; error: string } {
  if (!Object.hasOwn(EXTENSION, a.tipo)) return { ok: false, error: "El comprobante tiene que ser una imagen JPG o PNG." };
  if (!Number.isInteger(a.tamano) || a.tamano <= 0) return { ok: false, error: "El archivo está vacío." };
  if (a.tamano > TAMANO_MAXIMO) return { ok: false, error: "El comprobante no puede superar 5 MB." };
  return { ok: true, tipo: a.tipo as TipoComprobante };
}

/** {usuario}/{id}.{jpg|png}: la carpeta es lo que miran las políticas de Storage. */
export function rutaDelComprobante(usuarioId: string, id: string, tipo: TipoComprobante): string {
  return `${usuarioId}/${id}.${EXTENSION[tipo]}`;
}

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const RUTA = new RegExp(`^(${UUID})/${UUID}\\.(jpg|png)$`);

/** La ruta que manda el formulario, solo si está bien formada y en la carpeta de quien la manda. */
export function rutaPropia(ruta: unknown, usuarioId: string): string | null {
  if (typeof ruta !== "string") return null;
  const m = RUTA.exec(ruta);
  return m && m[1] === usuarioId ? ruta : null;
}

/** La extensión de la ruta tiene que corresponder al tipo que registró Storage. */
export function coincideConRuta(ruta: string, tipo: TipoComprobante): boolean {
  return ruta.endsWith(`.${EXTENSION[tipo]}`);
}

/** Campos `comprobante` (ruta subida) y `quitarComprobante` ("1") del formulario de un trabajo. */
export function leerComprobante(
  entrada: Record<string, unknown>,
  usuarioId: string,
): { ok: true; cambio: CambioComprobante } | { ok: false; error: string } {
  const ruta = entrada.comprobante;
  if (ruta !== undefined && ruta !== null && ruta !== "") {
    const propia = rutaPropia(ruta, usuarioId);
    return propia
      ? { ok: true, cambio: { accion: "poner", ruta: propia } }
      : { ok: false, error: "No pudimos usar ese comprobante. Volvé a adjuntarlo." };
  }
  return { ok: true, cambio: entrada.quitarComprobante === "1" ? { accion: "quitar" } : { accion: "mantener" } };
}
