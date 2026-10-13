import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ClaimsUsuario } from "@/datos/cliente-usuario";
import { prismaPrivilegiado, supabaseAdmin } from "@/datos/privilegiado";
import { BUCKET } from "@/dominio/comprobante";

/** Credenciales de los usuarios de prueba, para abrir sesiones de Storage (sesionDe). */
const credenciales = new Map<string, { email: string; password: string }>();

export async function crearUsuarioPrueba(prefijo: string): Promise<string> {
  const email = `prueba-${prefijo}-${randomUUID().slice(0, 8)}@example.com`;
  const password = randomUUID();
  const { data, error } = await supabaseAdmin().auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw new Error(`No se pudo crear el usuario de prueba: ${error?.message}`);
  credenciales.set(data.user.id, { email, password });
  return data.user.id;
}

/** Borra el usuario y su carpeta de comprobantes (borrar el usuario de Auth no borra sus archivos). */
export async function borrarUsuarioPrueba(id: string): Promise<void> {
  const almacen = supabaseAdmin().storage.from(BUCKET);
  const { data } = await almacen.list(id, { limit: 1000 });
  if (data && data.length > 0) await almacen.remove(data.map((o) => `${id}/${o.name}`));
  const { error } = await supabaseAdmin().auth.admin.deleteUser(id);
  if (error) throw new Error(`No se pudo borrar el usuario de prueba: ${error.message}`);
}

/** Cliente de Supabase con la sesión del usuario de prueba, como el del navegador o el de una acción. */
export async function sesionDe(id: string): Promise<SupabaseClient> {
  const cliente = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const cred = credenciales.get(id);
  if (!cred) throw new Error("Ese usuario no se creó con crearUsuarioPrueba.");
  const { error } = await cliente.auth.signInWithPassword(cred);
  if (error) throw new Error(`No se pudo abrir la sesión de prueba: ${error.message}`);
  return cliente;
}

/** Un PNG de 1×1 completado con ceros hasta `bytes` (Storage mira el tipo declarado, no el contenido). */
export function pngDe(bytes = 68): Blob {
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=",
    "base64",
  );
  const contenido = new Uint8Array(Math.max(bytes, png.length));
  contenido.set(png);
  return new Blob([contenido.subarray(0, bytes)], { type: "image/png" });
}

export function claimsDe(id: string): ClaimsUsuario {
  return { sub: id, role: "authenticated" };
}

export async function asignarRol(id: string, rolId: 2 | 3): Promise<void> {
  await prismaPrivilegiado.usuarioRol.create({ data: { usuarioId: id, rolId } });
}
