import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  confirmarSupuesto,
  corregirSupuesto,
  estadoDelVehiculo,
  marcarAVerificar,
  resumenesDeMisVehiculos,
  supuestosDelVehiculo,
} from "@/datos/estado";
import { crearVehiculo } from "@/datos/vehiculos";
import { prismaPrivilegiado as db } from "@/datos/privilegiado";
import { sembrar } from "../../prisma/seed";
import { borrarUsuarioPrueba, claimsDe, crearUsuarioPrueba } from "./ayudantes";

let a: string;
let b: string;
let kaId: number;

beforeAll(async () => {
  await sembrar();
  kaId = (await db.modelo.findFirstOrThrow({ where: { nombre: "Ka", marca: { nombre: "Ford" } } })).id;
  a = await crearUsuarioPrueba("estado-a");
  b = await crearUsuarioPrueba("estado-b");
});

afterAll(async () => {
  await borrarUsuarioPrueba(a);
  await borrarUsuarioPrueba(b);
});

async function nuevoKa(usuario: string, km: number): Promise<string> {
  const r = await crearVehiculo(claimsDe(usuario), { tipo: "catalogo", modeloId: kaId, anio: 2014 }, km);
  if (!r.ok) throw new Error("No se pudo crear el Ka de prueba");
  return r.valor.id;
}

const supuestosDe = (vehiculoId: string) =>
  db.intervencion.count({ where: { vehiculoId, origen: { in: ["supuesta_pendiente", "supuesta_a_verificar"] } } });

describe("estadoDelVehiculo (CU-09, CU-14)", () => {
  it("calcula los 8 ítems del Ka y guarda los 6 supuestos de un auto cargado con 62.400 km", async () => {
    const id = await nuevoKa(a, 62_400);
    const e = await estadoDelVehiculo(claimsDe(a), id);
    expect(e?.catalogado).toBe(true);
    expect(e?.kmActual).toBe(62_400);
    expect(e?.items).toHaveLength(8);
    expect(e?.items.filter((i) => i.incertidumbre === "a_confirmar")).toHaveLength(6);
    expect(await supuestosDe(id)).toBe(6);
  });

  it("no duplica los supuestos al consultar varias veces, ni en simultáneo", async () => {
    const id = await nuevoKa(a, 62_400);
    await Promise.all([1, 2, 3].map(() => estadoDelVehiculo(claimsDe(a), id)));
    await estadoDelVehiculo(claimsDe(a), id);
    expect(await supuestosDe(id)).toBe(6);
  });

  it("un auto nuevo no recibe supuestos", async () => {
    const id = await nuevoKa(a, 500);
    const e = await estadoDelVehiculo(claimsDe(a), id);
    expect(e?.items.every((i) => i.incertidumbre === null && i.estado === "al_dia")).toBe(true);
    expect(await supuestosDe(id)).toBe(0);
  });

  it("un modelo fuera del catálogo no tiene ítems", async () => {
    const r = await crearVehiculo(claimsDe(a), { tipo: "libre", marca: "Peugeot", modelo: "208", anio: 2019 }, 41_000);
    if (!r.ok) throw new Error("alta");
    expect(await estadoDelVehiculo(claimsDe(a), r.valor.id)).toEqual({ catalogado: false, kmActual: 41_000, items: [] });
  });

  it("el vehículo de otro usuario no existe para él y no recibe supuestos", async () => {
    const id = await db.vehiculo
      .create({ data: { usuarioId: a, modeloId: kaId, anio: 2014, lecturas: { create: { kilometraje: 62_400, fecha: new Date() } } } })
      .then((v) => v.id);
    expect(await estadoDelVehiculo(claimsDe(b), id)).toBeNull();
    expect(await supuestosDe(id)).toBe(0);
  });

  it("un id mal formado devuelve null", async () => {
    expect(await estadoDelVehiculo(claimsDe(a), "no-es-un-uuid")).toBeNull();
  });

  it("un ítem agregado al plan publicado recibe su supuesto en la próxima consulta", async () => {
    const id = await nuevoKa(a, 62_400);
    await estadoDelVehiculo(claimsDe(a), id);
    const plan = await db.planMantenimiento.findFirstOrThrow({ where: { modeloId: kaId, estado: "publicado" } });
    const item = await db.itemMantenimiento.create({ data: { modeloId: kaId, nombre: `Filtro de prueba ${Date.now()}`, tipo: "reemplazo" } });
    await db.intervaloPlan.create({ data: { planId: plan.id, itemId: item.id, intervaloKm: 30_000 } });
    try {
      const e = await estadoDelVehiculo(claimsDe(a), id);
      expect(e?.items).toHaveLength(9);
      expect(await supuestosDe(id)).toBe(7);
    } finally {
      await db.intervencion.deleteMany({ where: { itemId: item.id } });
      await db.intervaloPlan.delete({ where: { planId_itemId: { planId: plan.id, itemId: item.id } } });
      await db.itemMantenimiento.delete({ where: { id: item.id } });
    }
  });

  it("un instante con hora se toma como el día de Argentina", async () => {
    const id = await nuevoKa(a, 500);
    // 01/01/2027 00:30 UTC = 31/12/2026 21:30 en Buenos Aires
    const conHora = await estadoDelVehiculo(claimsDe(a), id, new Date("2027-01-01T00:30:00Z"));
    const dia = await estadoDelVehiculo(claimsDe(a), id, new Date("2026-12-31T12:00:00Z"));
    // El margen por fecha depende del día: sin normalizar, el 01/01 UTC daría un día menos.
    expect(conHora?.items.map((i) => i.margen)).toEqual(dia?.items.map((i) => i.margen));
  });
});

describe("resumenesDeMisVehiculos (mockup 04)", () => {
  it("resume cada vehículo del usuario, con null para los que no están en el catálogo", async () => {
    const u = await crearUsuarioPrueba("resumen");
    try {
      const ka = (await crearVehiculo(claimsDe(u), { tipo: "catalogo", modeloId: kaId, anio: 2014 }, 62_400)) as {
        ok: true;
        valor: { id: string };
      };
      const libre = (await crearVehiculo(claimsDe(u), { tipo: "libre", marca: "Fiat", modelo: "Uno", anio: 2010 }, 90_000)) as {
        ok: true;
        valor: { id: string };
      };
      const r = await resumenesDeMisVehiculos(claimsDe(u));
      expect(r[ka.valor.id]).toEqual({ vencidos: 0, proximos: 0, inciertos: 6 });
      expect(r[libre.valor.id]).toBeNull();
    } finally {
      await borrarUsuarioPrueba(u);
    }
  });
});

describe("confirmación de supuestos (CU-06)", () => {
  async function kaConSupuestos(usuario: string) {
    const id = await nuevoKa(usuario, 62_400);
    const s = await supuestosDelVehiculo(claimsDe(usuario), id);
    const aceite = s!.supuestos.find((x) => x.nombre === "Aceite y filtro de aceite")!;
    return { id, aceite };
  }
  const itemDe = async (u: string, id: string, itemId: number) =>
    (await estadoDelVehiculo(claimsDe(u), id))!.items.find((i) => i.itemId === itemId)!;

  it("lista los 6 supuestos con su km y la lectura actual", async () => {
    const { id, aceite } = await kaConSupuestos(a);
    const s = await supuestosDelVehiculo(claimsDe(a), id);
    expect(s?.kmActual).toBe(62_400);
    expect(s?.supuestos).toHaveLength(6);
    expect(aceite).toMatchObject({ km: 60_000, origen: "supuesta_pendiente" });
  });

  it("confirmar guarda la fecha y saca la marca (paso 3)", async () => {
    const { id, aceite } = await kaConSupuestos(a);
    expect(await confirmarSupuesto(claimsDe(a), id, aceite.itemId, "2026-03-10")).toEqual({ ok: true, valor: null });
    const fila = await db.intervencion.findFirstOrThrow({ where: { vehiculoId: id, itemId: aceite.itemId } });
    expect(fila).toMatchObject({ origen: "supuesta_confirmada", kilometraje: 60_000, fecha: new Date("2026-03-10T00:00:00Z") });
    expect(await itemDe(a, id, aceite.itemId)).toMatchObject({ incertidumbre: null, fechaVence: new Date("2027-03-10T00:00:00Z") });
    expect((await supuestosDelVehiculo(claimsDe(a), id))?.supuestos).toHaveLength(5);
  });

  it("confirmar dos veces no pisa la fecha ya confirmada", async () => {
    const { id, aceite } = await kaConSupuestos(a);
    await confirmarSupuesto(claimsDe(a), id, aceite.itemId, "2026-03-10");
    const r = await confirmarSupuesto(claimsDe(a), id, aceite.itemId, "2026-04-01");
    expect(r.ok).toBe(false);
    const fila = await db.intervencion.findFirstOrThrow({ where: { vehiculoId: id, itemId: aceite.itemId } });
    expect(fila.fecha).toEqual(new Date("2026-03-10T00:00:00Z"));
  });

  it("rechaza una fecha futura (2d) sin cambiar nada", async () => {
    const { id, aceite } = await kaConSupuestos(a);
    const r = await confirmarSupuesto(claimsDe(a), id, aceite.itemId, "2099-01-01");
    expect(r).toEqual({ ok: false, errores: { fecha: "La fecha no puede ser posterior a hoy." } });
    expect((await db.intervencion.findFirstOrThrow({ where: { vehiculoId: id, itemId: aceite.itemId } })).origen).toBe(
      "supuesta_pendiente",
    );
  });

  it("corregir reemplaza km y fecha y queda confirmado (2a)", async () => {
    const { id, aceite } = await kaConSupuestos(a);
    expect(await corregirSupuesto(claimsDe(a), id, aceite.itemId, "58.000", "2026-02-01")).toEqual({ ok: true, valor: null });
    expect(await db.intervencion.findFirstOrThrow({ where: { vehiculoId: id, itemId: aceite.itemId } })).toMatchObject({
      origen: "supuesta_confirmada",
      kilometraje: 58_000,
      fecha: new Date("2026-02-01T00:00:00Z"),
    });
  });

  it("corregir con km mayor a la lectura actual se rechaza (2d)", async () => {
    const { id, aceite } = await kaConSupuestos(a);
    expect(await corregirSupuesto(claimsDe(a), id, aceite.itemId, "63000", "2026-02-01")).toEqual({
      ok: false,
      errores: { km: "No puede superar 62.400 km, la lectura actual." },
    });
  });

  it('"No lo sé" lo marca para verificar en el taller (2b) y se puede confirmar después', async () => {
    const { id, aceite } = await kaConSupuestos(a);
    expect(await marcarAVerificar(claimsDe(a), id, aceite.itemId)).toEqual({ ok: true, valor: null });
    expect((await itemDe(a, id, aceite.itemId)).incertidumbre).toBe("verificar_en_taller");
    expect(await confirmarSupuesto(claimsDe(a), id, aceite.itemId, "2026-03-10")).toEqual({ ok: true, valor: null });
  });

  it("otro usuario no puede confirmar, corregir ni marcar supuestos ajenos", async () => {
    const { id, aceite } = await kaConSupuestos(a);
    for (const r of [
      await confirmarSupuesto(claimsDe(b), id, aceite.itemId, "2026-03-10"),
      await corregirSupuesto(claimsDe(b), id, aceite.itemId, "1000", "2026-03-10"),
      await marcarAVerificar(claimsDe(b), id, aceite.itemId),
    ]) {
      expect(r.ok).toBe(false);
    }
    expect((await db.intervencion.findFirstOrThrow({ where: { vehiculoId: id, itemId: aceite.itemId } })).origen).toBe(
      "supuesta_pendiente",
    );
    expect(await supuestosDelVehiculo(claimsDe(b), id)).toBeNull();
  });
});
