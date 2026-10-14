import { erroresDe, esquemaBuscarCuenta } from "@/dominio/cuenta";
import { esquemaCambiarRol } from "@/dominio/roles";
import { conUsuario, type ClaimsUsuario } from "./cliente-usuario";
import type { Resultado } from "./vehiculos";

export type Cuenta = { id: string; email: string; roles: string[] };

/** CU-18 pasos 1-2: correo exacto. La función SQL rechaza a quien no es administrador técnico. */
export async function buscarCuenta(claims: ClaimsUsuario, entrada: { email: unknown }): Promise<Resultado<Cuenta>> {
  const v = esquemaBuscarCuenta.safeParse(entrada);
  if (!v.success) return { ok: false, errores: erroresDe(v.error) };
  const filas = await conUsuario(
    claims,
    (tx) => tx.$queryRaw<Cuenta[]>`SELECT id::text AS id, email, roles FROM public.buscar_cuenta(${v.data.email})`,
  );
  const cuenta = filas[0];
  return cuenta ? { ok: true, valor: cuenta } : { ok: false, errores: { email: "No hay ninguna cuenta con ese correo." } };
}

/** CU-18 pasos 3-4, RF-21: otorga o revoca solo administrador_catalogo; devuelve los roles que quedaron. */
export async function cambiarRolCatalogo(
  claims: ClaimsUsuario,
  entrada: { usuarioId: unknown; otorgar: unknown },
): Promise<Resultado<string[]>> {
  const v = esquemaCambiarRol.safeParse(entrada);
  if (!v.success) return { ok: false, errores: erroresDe(v.error) };
  const [fila] = await conUsuario(
    claims,
    (tx) => tx.$queryRaw<{ roles: string[] | null }[]>`
      SELECT public.cambiar_rol_catalogo(${v.data.usuarioId}::uuid, ${v.data.otorgar}) AS roles`,
  );
  return fila?.roles ? { ok: true, valor: fila.roles } : { ok: false, errores: { usuarioId: "No encontramos la cuenta." } };
}
