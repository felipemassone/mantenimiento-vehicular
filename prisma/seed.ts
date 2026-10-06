import "./cargar-entorno";
import { prismaPrivilegiado as db } from "../src/datos/privilegiado";

type ItemSemilla = { nombre: string; tipo: "reemplazo" | "inspeccion"; km: number; meses: number | null };

/**
 * Programa de mantenimiento Ford - KA (KaGarantia2014-02.pdf, págs. impresas 18–27).
 * Ante contradicciones del manual se usa el intervalo más conservador (spec, apartado 7).
 * Filtro de aire, filtro de combustible y bujías no se cargan hasta verificar su intervalo.
 */
const PLAN_KA: ItemSemilla[] = [
  // pág. 18: "Reemplazar cada 1 año ó 15.000 km"
  { nombre: "Aceite y filtro de aceite", tipo: "reemplazo", km: 15000, meses: 12 },
  // pág. 18: "Reemplazar el fluido cada 2 años ó 45.000 Km"
  { nombre: "Líquido de frenos", tipo: "reemplazo", km: 45000, meses: 24 },
  // pág. 19: "cada 3 años ó 90.000 Km"; pág. 25: "Cada 10 años o 105.000 km". Se usa el menor.
  { nombre: "Líquido de enfriamiento", tipo: "reemplazo", km: 90000, meses: 36 },
  // pág. 25: "Cada 5 años ó 90.000 km"
  { nombre: "Correa auxiliar", tipo: "reemplazo", km: 90000, meses: 60 },
  // págs. 26–27: se comprueba el desgaste en cada servicio de 15.000 km ó 1 año
  { nombre: "Pastillas de freno delanteras", tipo: "inspeccion", km: 15000, meses: 12 },
  // págs. 26–27: cintas de freno traseras cada 45.000 km ó 3 años
  { nombre: "Cintas de freno traseras", tipo: "inspeccion", km: 45000, meses: 36 },
  { nombre: "Amortiguadores", tipo: "inspeccion", km: 15000, meses: 12 },
  { nombre: "Neumáticos", tipo: "inspeccion", km: 15000, meses: 12 },
];

export async function sembrar(): Promise<void> {
  const ford = await db.marca.upsert({ where: { nombre: "Ford" }, update: {}, create: { nombre: "Ford" } });

  const existente = await db.modelo.findFirst({ where: { marcaId: ford.id, nombre: "Ka", anioDesde: 2014 } });
  const ka =
    existente ??
    (await db.modelo.create({ data: { marcaId: ford.id, nombre: "Ka", anioDesde: 2014, anioHasta: 2014 } }));

  const plan = await db.planMantenimiento.upsert({
    where: { modeloId_version: { modeloId: ka.id, version: 1 } },
    update: {},
    create: { modeloId: ka.id, version: 1, estado: "publicado", fechaPublicacion: new Date() },
  });

  for (const it of PLAN_KA) {
    const item = await db.itemMantenimiento.upsert({
      where: { modeloId_nombre: { modeloId: ka.id, nombre: it.nombre } },
      update: { tipo: it.tipo },
      create: { modeloId: ka.id, nombre: it.nombre, tipo: it.tipo },
    });
    await db.intervaloPlan.upsert({
      where: { planId_itemId: { planId: plan.id, itemId: item.id } },
      update: { intervaloKm: it.km, intervaloMeses: it.meses },
      create: { planId: plan.id, itemId: item.id, intervaloKm: it.km, intervaloMeses: it.meses },
    });
  }

  const email = process.env.ADMIN_EMAIL;
  const admin = email ? await db.usuario.findUnique({ where: { email } }) : null;
  if (!admin) {
    console.log("ADMIN_EMAIL todavía no tiene cuenta: registrate en la app y volvé a ejecutar el seed.");
    return;
  }
  for (const rolId of [2, 3]) {
    await db.usuarioRol.upsert({
      where: { usuarioId_rolId: { usuarioId: admin.id, rolId } },
      update: {},
      create: { usuarioId: admin.id, rolId },
    });
  }
  console.log("Roles de administrador asignados a ADMIN_EMAIL.");
}

if (process.argv[1]?.endsWith("seed.ts")) {
  sembrar()
    .then(() => db.$disconnect())
    .catch(async (e) => {
      console.error(e);
      await db.$disconnect();
      process.exit(1);
    });
}
