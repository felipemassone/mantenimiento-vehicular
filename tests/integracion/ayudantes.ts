import { randomUUID } from "node:crypto";
import type { ClaimsUsuario } from "@/datos/cliente-usuario";
import { prismaPrivilegiado, supabaseAdmin } from "@/datos/privilegiado";

export async function crearUsuarioPrueba(prefijo: string): Promise<string> {
  const email = `prueba-${prefijo}-${randomUUID().slice(0, 8)}@example.com`;
  const { data, error } = await supabaseAdmin().auth.admin.createUser({
    email,
    password: randomUUID(),
    email_confirm: true,
  });
  if (error || !data.user) throw new Error(`No se pudo crear el usuario de prueba: ${error?.message}`);
  return data.user.id;
}

export async function borrarUsuarioPrueba(id: string): Promise<void> {
  const { error } = await supabaseAdmin().auth.admin.deleteUser(id);
  if (error) throw new Error(`No se pudo borrar el usuario de prueba: ${error.message}`);
}

export function claimsDe(id: string): ClaimsUsuario {
  return { sub: id, role: "authenticated" };
}

export async function asignarRol(id: string, rolId: 2 | 3): Promise<void> {
  await prismaPrivilegiado.usuarioRol.create({ data: { usuarioId: id, rolId } });
}
