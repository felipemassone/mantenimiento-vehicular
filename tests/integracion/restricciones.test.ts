import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prismaPrivilegiado as db } from "@/datos/privilegiado";
import { borrarUsuarioPrueba, crearUsuarioPrueba } from "./ayudantes";

let usuario: string;
let vehiculo: string;
let marcaId: number;
let modeloId: number;
let itemId: number;

beforeAll(async () => {
  usuario = await crearUsuarioPrueba("restr");
  vehiculo = (
    await db.vehiculo.create({
      data: { usuarioId: usuario, marcaLibre: "Fiat", modeloLibre: "Uno", anio: 2010 },
    })
  ).id;
  marcaId = (await db.marca.create({ data: { nombre: `Restr ${Date.now()}` } })).id;
  modeloId = (await db.modelo.create({ data: { marcaId, nombre: "M", anioDesde: 2010 } })).id;
  itemId = (await db.itemMantenimiento.create({ data: { modeloId, nombre: "Aceite", tipo: "reemplazo" } })).id;
});

afterAll(async () => {
  await db.intervaloPlan.deleteMany({ where: { itemId } });
  await db.planMantenimiento.deleteMany({ where: { modeloId } });
  await db.itemMantenimiento.deleteMany({ where: { modeloId } });
  await db.modelo.deleteMany({ where: { marcaId } });
  await db.marca.deleteMany({ where: { id: marcaId } });
  await borrarUsuarioPrueba(usuario);
});

describe("restricciones de verificación (apartado 7.1.2)", () => {
  it("rechaza un kilometraje negativo", async () => {
    await expect(
      db.lecturaKilometraje.create({ data: { vehiculoId: vehiculo, kilometraje: -1, fecha: new Date() } }),
    ).rejects.toThrow(/lectura_km_no_negativo/);
  });

  it("acepta un auto 0 km", async () => {
    const l = await db.lecturaKilometraje.create({
      data: { vehiculoId: vehiculo, kilometraje: 0, fecha: new Date() },
    });
    expect(l.kilometraje).toBe(0);
  });

  it("rechaza un vehículo con modelo del catálogo y además modelo libre", async () => {
    await expect(
      db.vehiculo.create({
        data: { usuarioId: usuario, modeloId, marcaLibre: "X", modeloLibre: "Y", anio: 2012 },
      }),
    ).rejects.toThrow(/vehiculo_modelo_o_libre/);
  });

  it("rechaza un vehículo sin modelo de ningún tipo", async () => {
    await expect(db.vehiculo.create({ data: { usuarioId: usuario, anio: 2012 } })).rejects.toThrow(
      /vehiculo_modelo_o_libre/,
    );
  });

  it("rechaza un rango de años invertido", async () => {
    await expect(
      db.modelo.create({ data: { marcaId, nombre: "Invertido", anioDesde: 2020, anioHasta: 2010 } }),
    ).rejects.toThrow(/modelo_rango_anios/);
  });

  it("rechaza un intervalo nulo o negativo (RF-20)", async () => {
    const plan = await db.planMantenimiento.create({ data: { modeloId, version: 1, estado: "borrador" } });
    await expect(
      db.intervaloPlan.create({ data: { planId: plan.id, itemId, intervaloKm: 0 } }),
    ).rejects.toThrow(/intervalo_km_positivo/);
  });

  it("rechaza una intervención con ítem y descripción libre a la vez", async () => {
    await expect(
      db.intervencion.create({
        data: { vehiculoId: vehiculo, itemId, descripcionLibre: "Algo", origen: "registrada", kilometraje: 1000 },
      }),
    ).rejects.toThrow(/intervencion_item_o_descripcion/);
  });

  it("no admite dos planes publicados para el mismo modelo", async () => {
    await db.planMantenimiento.create({
      data: { modeloId, version: 2, estado: "publicado", fechaPublicacion: new Date() },
    });
    await expect(
      db.planMantenimiento.create({
        data: { modeloId, version: 3, estado: "publicado", fechaPublicacion: new Date() },
      }),
    ).rejects.toThrow();
    expect(await db.planMantenimiento.count({ where: { modeloId, estado: "publicado" } })).toBe(1);
  });
});

describe("odómetro en la base (RF-07, migración 0003)", () => {
  it("rechaza una lectura menor aunque se inserte por fuera de la aplicación", async () => {
    const u = await crearUsuarioPrueba("odometro");
    try {
      const ka = await db.modelo.findFirstOrThrow({ where: { nombre: "Ka", marca: { nombre: "Ford" } } });
      const v = await db.vehiculo.create({
        data: { usuarioId: u, modeloId: ka.id, anio: 2014, lecturas: { create: { kilometraje: 50_000, fecha: new Date() } } },
      });
      await expect(
        db.lecturaKilometraje.create({ data: { vehiculoId: v.id, kilometraje: 49_000, fecha: new Date() } }),
      ).rejects.toThrow(/menor que la última/);
      await expect(
        db.lecturaKilometraje.create({ data: { vehiculoId: v.id, kilometraje: 50_000, fecha: new Date() } }),
      ).resolves.toBeTruthy();
    } finally {
      await borrarUsuarioPrueba(u);
    }
  });

  it("no admite dos supuestos para el mismo vehículo e ítem", async () => {
    const u = await crearUsuarioPrueba("supuesto-unico");
    try {
      const ka = await db.modelo.findFirstOrThrow({ where: { nombre: "Ka", marca: { nombre: "Ford" } } });
      const item = await db.itemMantenimiento.findFirstOrThrow({ where: { modeloId: ka.id, nombre: "Aceite y filtro de aceite" } });
      const v = await db.vehiculo.create({ data: { usuarioId: u, modeloId: ka.id, anio: 2014 } });
      const supuesto = { vehiculoId: v.id, itemId: item.id, origen: "supuesta_pendiente" as const, kilometraje: 60_000 };
      await db.intervencion.create({ data: supuesto });
      await expect(db.intervencion.create({ data: { ...supuesto, origen: "supuesta_a_verificar" } })).rejects.toThrow();
      // Las intervenciones registradas no tienen ese límite.
      await db.intervencion.create({ data: { ...supuesto, origen: "registrada", fecha: new Date() } });
      await db.intervencion.create({ data: { ...supuesto, origen: "registrada", fecha: new Date() } });
    } finally {
      await borrarUsuarioPrueba(u);
    }
  });
});
