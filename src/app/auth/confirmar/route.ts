import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";
import { rutaSegura } from "@/dominio/cuenta";
import { createClient } from "@/lib/supabase/server";

/**
 * CU-01 pasos 6–7 y CU-03 paso 3: valida el enlace de un solo uso y abre la sesión.
 * Acepta los dos formatos de enlace de Supabase:
 * - `code` (PKCE): plantillas por defecto. Se abre en el mismo navegador donde se pidió.
 * - `token_hash`: plantillas propias, disponibles con SMTP propio (plan 1E). Funciona en cualquier dispositivo.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = rutaSegura(searchParams.get("next"), "/vehiculos");
  const esRecuperacion = type === "recovery" || next === "/recuperar/nueva";

  const supabase = await createClient();
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) redirect(next);
  } else if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) redirect(next);
  }
  // CU-01 6a / CU-03 3a: enlace usado, vencido o abierto en otro navegador
  redirect(esRecuperacion ? "/recuperar?enlace=invalido" : "/ingresar?enlace=invalido");
}
