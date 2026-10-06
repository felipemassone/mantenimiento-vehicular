import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";
import { rutaSegura } from "@/dominio/cuenta";
import { createClient } from "@/lib/supabase/server";

/** CU-01 pasos 6–7 y CU-03 paso 3: valida el enlace de un solo uso y abre la sesión. */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = rutaSegura(searchParams.get("next"), "/vehiculos");

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) redirect(next);
  }
  // CU-01 6a / CU-03 3a: enlace usado o vencido
  redirect(type === "recovery" ? "/recuperar?enlace=invalido" : "/ingresar?enlace=invalido");
}
