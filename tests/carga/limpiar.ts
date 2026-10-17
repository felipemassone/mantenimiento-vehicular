/**
 * PS-07, al terminar: borra las cuentas de la prueba de carga (el vehículo, sus lecturas y los
 * supuestos se van en cascada; no subieron comprobantes). Uso: npx tsx tests/carga/limpiar.ts
 */
import { rmSync } from "node:fs";
import { config } from "dotenv";
import { admin, PREFIJO, SESIONES } from "./comun";

config({ path: ".env.local", quiet: true });

async function main() {
  const deCarga: { id: string; email?: string }[] = [];
  for (let pagina = 1; ; pagina++) {
    const { data, error } = await admin().auth.admin.listUsers({ page: pagina, perPage: 1000 });
    if (error) throw new Error(`No se pudieron listar las cuentas: ${error.message}`);
    deCarga.push(...data.users.filter((u) => u.email?.startsWith(PREFIJO)));
    if (data.users.length < 1000) break;
  }
  for (const u of deCarga) {
    const { error } = await admin().auth.admin.deleteUser(u.id);
    if (error) throw new Error(`No se pudo borrar ${u.email}: ${error.message}`);
  }
  rmSync(SESIONES, { force: true });
  console.log(`${deCarga.length} cuentas de carga borradas`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
