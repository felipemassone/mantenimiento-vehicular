import { conUsuario, type ClaimsUsuario } from "./cliente-usuario";

/** Roles de la cuenta, leídos con RLS (cada uno solo ve los suyos). */
export async function rolesDelUsuario(claims: ClaimsUsuario): Promise<string[]> {
  const filas = await conUsuario(claims, (tx) => tx.usuarioRol.findMany({ include: { rol: true } }));
  return filas.map((f) => f.rol.nombre).sort();
}
