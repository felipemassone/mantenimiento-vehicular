"use server";

import { redirect } from "next/navigation";
import { exigirClaims } from "@/datos/sesion";
import {
  erroresDe,
  esquemaCrearCuenta,
  esquemaIngresar,
  esquemaNuevaContrasena,
  esquemaPedirEnlace,
  type ErroresCampo,
} from "@/dominio/cuenta";
import { createClient } from "@/lib/supabase/server";

export type EstadoFormulario = {
  errores?: ErroresCampo;
  mensaje?: string;
  enviadoA?: string;
  sinConfirmar?: string;
};

const ERROR_GENERAL = "No pudimos completar la operación. Intentá de nuevo en unos minutos.";
const DEMASIADOS_CORREOS = "Mandamos demasiados correos. Esperá unos minutos y volvé a intentar.";

/** CU-01: crea la cuenta pendiente y Supabase envía el enlace de confirmación. */
export async function crearCuenta(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const r = esquemaCrearCuenta.safeParse({ email: datos.get("email"), contrasena: datos.get("contrasena") });
  if (!r.success) return { errores: erroresDe(r.error) };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email: r.data.email, password: r.data.contrasena });
  if (error) {
    if (error.code === "weak_password") {
      return { errores: { contrasena: "Esa contraseña es demasiado débil. Probá con otra." } };
    }
    if (error.code === "over_email_send_rate_limit") return { mensaje: DEMASIADOS_CORREOS };
    return { mensaje: ERROR_GENERAL };
  }
  // Con confirmación activada, Supabase no devuelve error si el correo ya existe: devuelve un usuario sin identidades.
  if (data.user && data.user.identities?.length === 0) {
    return { errores: { email: "Ya existe una cuenta con ese correo. Ingresá o recuperá tu contraseña." } };
  }
  return { enviadoA: r.data.email };
}

/** CU-01 6a y CU-02 2b: reenvía el enlace de confirmación. */
export async function reenviarConfirmacion(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const email = String(datos.get("email") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({ type: "signup", email });
  if (error) return { enviadoA: email, mensaje: "No pudimos reenviar el enlace. Esperá unos minutos y volvé a intentar." };
  return { enviadoA: email, mensaje: "Te mandamos un enlace nuevo." };
}

/** CU-02: valida las credenciales y abre la sesión. */
export async function ingresar(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const r = esquemaIngresar.safeParse({ email: datos.get("email"), contrasena: datos.get("contrasena") });
  if (!r.success) return { errores: erroresDe(r.error) };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: r.data.email, password: r.data.contrasena });
  if (error) {
    // 2b: cuenta sin confirmar
    if (error.code === "email_not_confirmed") return { sinConfirmar: r.data.email };
    // 2a: no se indica cuál de los dos datos es incorrecto
    if (error.code === "invalid_credentials") return { mensaje: "El correo o la contraseña no son válidos." };
    return { mensaje: ERROR_GENERAL };
  }
  redirect("/vehiculos");
}

/** CU-03 pasos 1–2. Responde igual exista o no la cuenta (2a). */
export async function pedirEnlace(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const r = esquemaPedirEnlace.safeParse({ email: datos.get("email") });
  if (!r.success) return { errores: erroresDe(r.error) };
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(r.data.email);
  if (error?.code === "over_email_send_rate_limit") return { mensaje: DEMASIADOS_CORREOS };
  return { enviadoA: r.data.email };
}

/** CU-03 paso 4. La sesión la abrió el enlace del correo en /auth/confirmar. */
export async function guardarContrasena(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  await exigirClaims();
  const r = esquemaNuevaContrasena.safeParse({ contrasena: datos.get("contrasena"), repetida: datos.get("repetida") });
  if (!r.success) return { errores: erroresDe(r.error) };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: r.data.contrasena });
  if (error?.code === "same_password") return { errores: { contrasena: "Elegí una contraseña distinta de la anterior." } };
  if (error) return { mensaje: ERROR_GENERAL };
  redirect("/vehiculos");
}

/** CU-02: cierra la sesión y revoca el token de actualización (RF-02). */
export async function cerrarSesion(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/ingresar");
}
