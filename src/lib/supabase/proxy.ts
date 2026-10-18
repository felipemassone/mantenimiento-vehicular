import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { esRutaDeIngreso, esRutaPublica } from "@/lib/rutas";
import { INICIO_PEDIDO } from "@/lib/tiempo-pedido";

/**
 * Renueva la sesión y redirige. NO es una barrera de seguridad (CVE-2025-29927):
 * cada página y cada acción vuelve a verificar con exigirClaims().
 * Basado en el ejemplo oficial vercel/next.js/examples/with-supabase.
 */
export async function updateSession(request: NextRequest) {
  // RNF-02: cuándo llegó el pedido al servidor; la ficha registra el tiempo total (ver INICIO_PEDIDO).
  request.headers.set(INICIO_PEDIDO, String(Date.now()));
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
        },
      },
    },
  );

  // No ejecutar nada entre createServerClient y getClaims(): renueva la sesión.
  const { data } = await supabase.auth.getClaims();
  const hayUsuario = Boolean(data?.claims);
  const ruta = request.nextUrl.pathname;

  if (!hayUsuario && !esRutaPublica(ruta)) {
    const url = request.nextUrl.clone();
    url.pathname = "/ingresar";
    url.search = "";
    return NextResponse.redirect(url);
  }
  if (hayUsuario && esRutaDeIngreso(ruta)) {
    const url = request.nextUrl.clone();
    url.pathname = "/vehiculos";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
