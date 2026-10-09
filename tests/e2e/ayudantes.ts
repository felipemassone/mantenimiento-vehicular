import { createClient } from "@supabase/supabase-js";

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.SUPABASE_SECRET_KEY;
  if (!url || !clave) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY.");
  return createClient(url, clave, { auth: { autoRefreshToken: false, persistSession: false } });
}

/**
 * Enlace de confirmación sin leer el correo (spec, apartado 8). Para un usuario existente sin
 * confirmar, `generateLink` de tipo signup emite un token nuevo y no envía nada.
 */
export async function enlaceDeConfirmacion(
  email: string,
  contrasena: string,
): Promise<{ ruta: string; usuarioId: string }> {
  const { data, error } = await admin().auth.admin.generateLink({ type: "signup", email, password: contrasena });
  if (error) throw new Error(`No se pudo generar el enlace: ${error.message}`);
  return {
    ruta: `/auth/confirmar?token_hash=${data.properties.hashed_token}&type=signup&next=%2Fvehiculos`,
    usuarioId: data.user.id,
  };
}

export async function existeUsuario(id: string): Promise<boolean> {
  const { data } = await admin().auth.admin.getUserById(id);
  return Boolean(data.user);
}

/** Si la prueba falló a mitad de camino, borra la cuenta que haya quedado. */
export async function borrarSiQuedo(email: string): Promise<void> {
  const { data } = await admin().auth.admin.listUsers({ perPage: 1000 });
  const usuario = data.users.find((u) => u.email === email);
  if (usuario) await admin().auth.admin.deleteUser(usuario.id);
}
