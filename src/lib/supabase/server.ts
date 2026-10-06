import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** No guardar en una variable global: crear uno por solicitud. */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Llamado desde un Server Component: lo resuelve proxy.ts al renovar la sesión.
          }
        },
      },
    },
  );
}
