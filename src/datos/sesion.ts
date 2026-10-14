import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ClaimsUsuario } from "./cliente-usuario";
import { esAdministrador } from "@/dominio/roles";
import { rolesDelUsuario } from "./cuenta";

/** Claims del token verificado en el servidor (firma asimétrica). Null si no hay sesión válida. */
export async function obtenerClaims(): Promise<ClaimsUsuario | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) return null;
  return {
    sub: claims.sub,
    role: "authenticated",
    email: typeof claims.email === "string" ? claims.email : undefined,
  };
}

/** Barrera real: toda página protegida y toda acción la llama. */
export async function exigirClaims(): Promise<ClaimsUsuario> {
  const claims = await obtenerClaims();
  if (!claims) redirect("/ingresar");
  return claims;
}

/** Además de RLS: sin el rol, la página no existe para ese usuario. */
export async function exigirRol(rol: "administrador_catalogo" | "administrador_tecnico"): Promise<ClaimsUsuario> {
  const claims = await exigirClaims();
  if (!(await rolesDelUsuario(claims)).includes(rol)) notFound();
  return claims;
}

/** /admin: cualquiera de los dos roles de administración; cada página exige el suyo. */
export async function exigirAdministracion(): Promise<{ claims: ClaimsUsuario; roles: string[] }> {
  const claims = await exigirClaims();
  const roles = await rolesDelUsuario(claims);
  if (!esAdministrador(roles)) notFound();
  return { claims, roles };
}
