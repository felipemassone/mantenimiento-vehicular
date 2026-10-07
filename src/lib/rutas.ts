const DE_INGRESO = ["/ingresar", "/crear-cuenta", "/recuperar"];

export function esRutaDeIngreso(ruta: string): boolean {
  return DE_INGRESO.includes(ruta);
}

/** Rutas que se pueden ver sin sesión. `/recuperar/nueva` no: la sesión la crea el enlace del correo. */
export function esRutaPublica(ruta: string): boolean {
  return esRutaDeIngreso(ruta) || ruta.startsWith("/auth/");
}
