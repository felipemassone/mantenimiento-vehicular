/**
 * PS-07 (RNF-02), paso previo: 50 cuentas de prueba en la base de desarrollo, cada una con un
 * Ford Ka 2014, y la cookie de sesión con la que k6 pide su ficha (tests/carga/ficha.js).
 * Uso: npx tsx tests/carga/preparar.ts  →  escribe tests/carga/sesiones.json (no se versiona).
 */
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { createServerClient } from "@supabase/ssr";
import { config } from "dotenv";
import { admin, PREFIJO, SESIONES } from "./comun";

config({ path: ".env.local", quiet: true });

const CUENTAS = Number(process.env.CUENTAS ?? 50);

/** Ingresa como lo haría el navegador y devuelve las cookies de sesión que deja @supabase/ssr. */
async function cookieDeSesion(email: string, password: string): Promise<string> {
  const frasco = new Map<string, string>();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => [...frasco].map(([name, value]) => ({ name, value })),
        setAll: (cookies) => cookies.forEach(({ name, value }) => frasco.set(name, value)),
      },
    },
  );
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`No se pudo ingresar con ${email}: ${error.message}`);
  return [...frasco].map(([nombre, valor]) => `${nombre}=${valor}`).join("; ");
}

async function main() {
  // Importados después de cargar .env.local: prisma.ts lee DATABASE_URL al importarse.
  const { catalogoPublicado, crearVehiculo } = await import("@/datos/vehiculos");
  const sesiones: { cookie: string; ficha: string }[] = [];
  for (let i = 1; i <= CUENTAS; i++) {
    const email = `${PREFIJO}${Date.now()}-${i}@example.com`;
    const password = randomUUID();
    const { data, error } = await admin().auth.admin.createUser({ email, password, email_confirm: true });
    if (error || !data.user) throw new Error(`No se pudo crear ${email}: ${error?.message}`);
    const claims = { sub: data.user.id, role: "authenticated" as const };
    const ka = (await catalogoPublicado(claims))
      .find((m) => m.nombre === "Ford")
      ?.modelos.find((m) => m.nombre === "Ka");
    if (!ka) throw new Error("El catálogo de desarrollo no tiene el Ford Ka publicado.");
    const vehiculo = await crearVehiculo(claims, { tipo: "catalogo", modeloId: ka.id, anio: 2014 }, 62400);
    if (!vehiculo.ok) throw new Error(`No se pudo cargar el Ka de ${email}.`);
    sesiones.push({ cookie: await cookieDeSesion(email, password), ficha: `/vehiculos/${vehiculo.valor.id}` });
    if (i % 10 === 0) console.log(`${i} de ${CUENTAS} cuentas listas`);
  }
  writeFileSync(SESIONES, JSON.stringify(sesiones));
  console.log(`Sesiones en ${SESIONES}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
