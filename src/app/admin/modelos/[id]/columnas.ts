/**
 * Columnas del plan en pantallas medianas en adelante, compartidas por la cabecera (servidor) y las
 * filas (cliente). Vive fuera de fila-item.tsx: lo que se importa de un módulo "use client" llega al
 * servidor como referencia, no como texto.
 */
export const COLUMNAS_ITEM = "md:grid-cols-[minmax(0,1fr)_110px_110px_110px_88px]";
