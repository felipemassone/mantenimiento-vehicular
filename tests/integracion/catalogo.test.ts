import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  actualizarModelo,
  agregarItem,
  crearModelo,
  descartarBorrador,
  editarIntervalo,
  listarModelos,
  planDeTrabajo,
  publicarPlan,
  quitarItem,
} from "@/datos/catalogo";
import { prismaPrivilegiado as db } from "@/datos/privilegiado";
import { catalogoPublicado } from "@/datos/vehiculos";
import { asignarRol, borrarUsuarioPrueba, claimsDe, crearUsuarioPrueba } from "./ayudantes";

const MARCA = `Prueba catálogo ${Date.now()}`;
let admin: string;
let propietario: string;
let modeloId: number;

beforeAll(async () => {
  admin = await crearUsuarioPrueba("cat-admin");
  propietario = await crearUsuarioPrueba("cat-prop");
  await asignarRol(admin, 2);
});

afterAll(async () => {
  const marca = await db.marca.findUnique({ where: { nombre: MARCA } });
  if (marca) {
    const modelos = await db.modelo.findMany({ where: { marcaId: marca.id } });
    for (const m of modelos) {
      await db.planMantenimiento.deleteMany({ where: { modeloId: m.id } });
      await db.itemMantenimiento.deleteMany({ where: { modeloId: m.id } });
    }
    await db.modelo.deleteMany({ where: { marcaId: marca.id } });
    await db.marca.delete({ where: { id: marca.id } });
  }
  await borrarUsuarioPrueba(admin);
  await borrarUsuarioPrueba(propietario);
});

describe("modelos (CU-15)", () => {
  it("crea el modelo, la marca nueva y un plan vacío en borrador", async () => {
    const r = await crearModelo(claimsDe(admin), { marca: MARCA, nombre: "Sandero", anioDesde: 2013, anioHasta: 2019 });
    expect(r.ok).toBe(true);
    modeloId = r.ok ? r.valor : 0;
    const plan = await planDeTrabajo(claimsDe(admin), modeloId);
    expect(plan).toMatchObject({ publicado: null, borrador: 1, items: [] });
  });

  it("rechaza el mismo modelo con años superpuestos (4a)", async () => {
    const r = await crearModelo(claimsDe(admin), {
      marca: MARCA.toUpperCase(),
      nombre: "sandero",
      anioDesde: 2015,
      anioHasta: 2022,
    });
    expect(r).toEqual({
      ok: false,
      errores: { anioDesde: `Ya existe ${MARCA} Sandero para 2013–2019. Los años no se pueden superponer.` },
    });
  });

  it("permite el mismo modelo en otro rango", async () => {
    const r = await crearModelo(claimsDe(admin), { marca: MARCA, nombre: "Sandero", anioDesde: 2020, anioHasta: null });
    expect(r.ok).toBe(true);
  });

  it("al editar, no choca consigo mismo (3a)", async () => {
    const r = await actualizarModelo(claimsDe(admin), modeloId, {
      marca: MARCA,
      nombre: "Sandero",
      anioDesde: 2013,
      anioHasta: 2018,
    });
    expect(r.ok).toBe(true);
  });

  it("un propietario no puede crear modelos (RLS)", async () => {
    await expect(
      crearModelo(claimsDe(propietario), { marca: MARCA, nombre: "Logan", anioDesde: 2010, anioHasta: 2015 }),
    ).rejects.toThrow();
  });
});

describe("ítems y publicación (CU-16, CU-17)", () => {
  it("no publica un plan vacío", async () => {
    expect(await publicarPlan(claimsDe(admin), modeloId)).toEqual({
      ok: false,
      errores: { plan: "El plan tiene que tener al menos un ítem." },
    });
  });

  it("agrega ítems al borrador y rechaza un nombre repetido", async () => {
    const aceite = { nombre: "Aceite y filtro", tipo: "reemplazo" as const, km: 10000, meses: 12 };
    expect((await agregarItem(claimsDe(admin), modeloId, aceite)).ok).toBe(true);
    const neumaticos = { nombre: "Neumáticos", tipo: "inspeccion" as const, km: 10000, meses: null };
    expect((await agregarItem(claimsDe(admin), modeloId, neumaticos)).ok).toBe(true);
    const repetido = await agregarItem(claimsDe(admin), modeloId, { ...aceite, nombre: "aceite y filtro", km: 5000 });
    expect(repetido).toEqual({ ok: false, errores: { nombre: "Ya hay un ítem con ese nombre en el plan." } });
  });

  it("publica la versión 1, que el propietario ya ve", async () => {
    expect(await publicarPlan(claimsDe(admin), modeloId)).toEqual({ ok: true, valor: 1 });
    const marcas = await catalogoPublicado(claimsDe(propietario));
    expect(marcas.find((m) => m.nombre === MARCA)?.modelos.map((m) => m.id)).toContain(modeloId);
    expect(await planDeTrabajo(claimsDe(admin), modeloId)).toMatchObject({ publicado: { version: 1 }, borrador: null });
  });

  it("editar el plan publicado crea la versión 2 en borrador; la publicada no cambia (CU-16 3a)", async () => {
    const [aceite] = (await planDeTrabajo(claimsDe(admin), modeloId))!.items.filter((i) => i.nombre === "Aceite y filtro");
    expect((await editarIntervalo(claimsDe(admin), modeloId, aceite!.itemId, { km: 15000, meses: 12 })).ok).toBe(true);
    const plan = (await planDeTrabajo(claimsDe(admin), modeloId))!;
    expect(plan).toMatchObject({ publicado: { version: 1 }, borrador: 2 });
    expect(plan.items.find((i) => i.nombre === "Aceite y filtro")?.km).toBe(15000);
    const v1 = await db.planMantenimiento.findFirstOrThrow({ where: { modeloId, version: 1 }, include: { intervalos: true } });
    expect(v1.intervalos.find((i) => i.itemId === aceite!.itemId)?.intervaloKm).toBe(10000);
  });

  it("quitar un ítem afecta solo al borrador", async () => {
    const [neum] = (await planDeTrabajo(claimsDe(admin), modeloId))!.items.filter((i) => i.nombre === "Neumáticos");
    expect((await quitarItem(claimsDe(admin), modeloId, neum!.itemId)).ok).toBe(true);
    expect((await planDeTrabajo(claimsDe(admin), modeloId))!.items.map((i) => i.nombre)).toEqual(["Aceite y filtro"]);
    expect(await db.intervaloPlan.count({ where: { plan: { modeloId, version: 1 } } })).toBe(2);
  });

  it("publicar la versión 2 reemplaza a la 1: siempre hay un solo plan publicado", async () => {
    expect(await publicarPlan(claimsDe(admin), modeloId)).toEqual({ ok: true, valor: 2 });
    const planes = await db.planMantenimiento.findMany({ where: { modeloId }, orderBy: { version: "asc" } });
    expect(planes.map((p) => p.estado)).toEqual(["reemplazado", "publicado"]);
  });

  it("descartar un borrador vuelve a la versión publicada", async () => {
    const [aceite] = (await planDeTrabajo(claimsDe(admin), modeloId))!.items;
    await editarIntervalo(claimsDe(admin), modeloId, aceite!.itemId, { km: 20000, meses: null });
    expect((await planDeTrabajo(claimsDe(admin), modeloId))!.borrador).toBe(3);
    expect((await descartarBorrador(claimsDe(admin), modeloId)).ok).toBe(true);
    const plan = (await planDeTrabajo(claimsDe(admin), modeloId))!;
    expect(plan).toMatchObject({ borrador: null, publicado: { version: 2 } });
    expect(plan.items[0]?.km).toBe(15000);
  });

  it("la tabla de modelos muestra versión publicada, borrador e ítems", async () => {
    const fila = (await listarModelos(claimsDe(admin))).find((m) => m.id === modeloId);
    expect(fila).toMatchObject({ marca: MARCA, nombre: "Sandero", publicado: { version: 2 }, borrador: null, items: 1 });
  });
});
