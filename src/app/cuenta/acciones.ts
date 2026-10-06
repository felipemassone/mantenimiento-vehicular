"use server";

import { createClient as clienteSinSesion } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/datos/privilegiado";
import { exigirClaims } from "@/datos/sesion";
import { createClient } from "@/lib/supabase/server";

/** CU-04: reverifica la contraseña (paso 3) y elimina la cuenta; la cascada borra todo (RF-04). */
export async function eliminarCuenta(_previo: { error?: string }, datos: FormData): Promise<{ error?: string }> {
  const claims = await exigirClaims();
  const contrasena = String(datos.get("contrasena") ?? "");
  if (!claims.email || !contrasena) return { error: "Ingresá tu contraseña para confirmar." };

  // Cliente sin cookies: verificar la contraseña no debe tocar la sesión actual.
  const verificador = clienteSinSesion(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { error: errorClave } = await verificador.auth.signInWithPassword({ email: claims.email, password: contrasena });
  if (errorClave) return { error: "La contraseña no es correcta." }; // 3b
  await verificador.auth.signOut();

  const { error } = await supabaseAdmin().auth.admin.deleteUser(claims.sub);
  if (error) return { error: "No pudimos eliminar la cuenta. Intentá de nuevo en unos minutos." };

  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/ingresar?cuenta=eliminada");
}
