import { z } from "zod";

/** CU-18, RF-21: el único rol que se otorga o revoca desde la app es administrador_catalogo. */
export const esquemaCambiarRol = z.object({
  usuarioId: z.uuid({ error: "No encontramos la cuenta." }),
  otorgar: z.enum(["1", "0"], { error: "Elegí otorgar o revocar." }).transform((v) => v === "1"),
});

const NOMBRE_ROL: Record<string, string> = {
  propietario: "Propietario",
  administrador_catalogo: "Administrador de catálogo",
  administrador_tecnico: "Administrador técnico",
};

export function nombreDeRol(rol: string): string {
  return NOMBRE_ROL[rol] ?? rol;
}

/** Entra a /admin quien tenga cualquiera de los dos roles de administración. */
export function esAdministrador(roles: string[]): boolean {
  return roles.includes("administrador_catalogo") || roles.includes("administrador_tecnico");
}
