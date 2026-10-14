"use server";

import { buscarCuenta, cambiarRolCatalogo, type Cuenta } from "@/datos/roles";
import { exigirRol } from "@/datos/sesion";
import type { ErroresCampo } from "@/dominio/cuenta";

export type EstadoUsuarios = { errores?: ErroresCampo; cuenta?: Cuenta; mensaje?: string; email?: string };

/** Pantalla 18: "buscar" (CU-18 pasos 1-2) o "cambiar" el rol de catálogo (pasos 3-4, RF-21). */
export async function gestionarUsuario(_previo: EstadoUsuarios, datos: FormData): Promise<EstadoUsuarios> {
  const claims = await exigirRol("administrador_tecnico");
  const email = String(datos.get("email") ?? "");
  if (datos.get("operacion") === "cambiar") {
    const otorgar = datos.get("otorgar");
    const r = await cambiarRolCatalogo(claims, { usuarioId: datos.get("usuarioId"), otorgar });
    if (!r.ok) return { errores: r.errores, email };
    const mensaje =
      otorgar === "1" ? "Listo: ahora es administrador de catálogo." : "Listo: ya no es administrador de catálogo.";
    // Se vuelve a buscar para mostrar lo que quedó en la base, no lo que creía la pantalla.
    const b = await buscarCuenta(claims, { email });
    return b.ok ? { cuenta: b.valor, mensaje, email } : { errores: b.errores, email };
  }
  const r = await buscarCuenta(claims, { email });
  return r.ok ? { cuenta: r.valor, email } : { errores: r.errores, email };
}
