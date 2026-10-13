import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { confirmarSupuesto, estadoDelVehiculo, supuestosDelVehiculo } from "@/datos/estado";
import {
  editarIntervencion,
  eliminarIntervencion,
  historialDelVehiculo,
  intervencionDelVehiculo,
  registrarIntervencion,
} from "@/datos/intervenciones";
import { prismaPrivilegiado as db } from "@/datos/privilegiado";
import { crearVehiculo } from "@/datos/vehiculos";
import { fechaDeHoy } from "@/dominio/fechas";
import { sembrar } from "../../prisma/seed";
import { borrarUsuarioPrueba, claimsDe, crearUsuarioPrueba } from "./ayudantes";

let a: string;
let b: string;
let kaId: number;
let aceite: number;

const hoy = () => fechaDeHoy().toISOString().slice(0, 10);

beforeAll(async () => {
  await sembrar();
  kaId = (await db.modelo.findFirstOrThrow({ where: { nombre: "Ka", marca: { nombre: "Ford" } } })).id;
  aceite = (await db.itemMantenimiento.findFirstOrThrow({ where: { modeloId: kaId, nombre: "Aceite y filtro de aceite" } })).id;
  a = await crearUsuarioPrueba("trabajos-a");
  b = await crearUsuarioPrueba("trabajos-b");
});

afterAll(async () => {
  await borrarUsuarioPrueba(a);
  await borrarUsuarioPrueba(b);
});

async function nuevoKa(usuario: string, km = 62400): Promise<string> {
  const r = await crearVehiculo(claimsDe(usuario), { tipo: "catalogo", modeloId: kaId, anio: 2014 }, km);
  if (!r.ok) throw new Error("No se pudo crear el Ka de prueba");
  await estadoDelVehiculo(claimsDe(usuario), r.valor.id); // crea los supuestos
  return r.valor.id;
}

const filaDe = async (usuario: string, vehiculoId: string, nombre: string) =>
  (await estadoDelVehiculo(claimsDe(usuario), vehiculoId))!.items.find((i) => i.nombre === nombre)!;

describe("registrarIntervencion (CU-10)", () => {
  it("un trabajo del plan reinicia el conteo y reemplaza al supuesto (3a)", async () => {
    const id = await nuevoKa(a);
    expect((await filaDe(a, id, "Aceite y filtro de aceite")).incertidumbre).toBe("a_confirmar");
    const r = await registrarIntervencion(claimsDe(a), id, {
      tipo: "catalogo", itemId: String(aceite), fecha: hoy(), km: "62400", taller: "Lubri", costo: "85.000",
    });
    expect(r.ok).toBe(true);
    const fila = await filaDe(a, id, "Aceite y filtro de aceite");
    expect(fila).toMatchObject({ estado: "al_dia", incertidumbre: null, kmVence: 77400 });
    expect(r.ok && r.valor.cambios).toEqual([]); // seguía "al día" para el motor, solo perdió la marca
    const guardada = await db.intervencion.findFirstOrThrow({ where: { vehiculoId: id, origen: "registrada" } });
    expect(guardada).toMatchObject({ itemId: aceite, kilometraje: 62400, taller: "Lubri", descripcionLibre: null });
    expect(guardada.costo?.toString()).toBe("85000");
  });

  it("un trabajo libre queda guardado sin cambiar ningún estado (RF-14)", async () => {
    const id = await nuevoKa(a);
    const antes = await estadoDelVehiculo(claimsDe(a), id);
    const r = await registrarIntervencion(claimsDe(a), id, { tipo: "libre", descripcion: "Escobillas", fecha: hoy(), km: "62400" });
    expect(r).toMatchObject({ ok: true, valor: { cambios: [] } });
    expect(await estadoDelVehiculo(claimsDe(a), id)).toEqual(antes);
    expect(await db.intervencion.count({ where: { vehiculoId: id, origen: "registrada", itemId: null } })).toBe(1);
  });

  it("con más km que la última lectura, registra la lectura con la fecha del día (4a)", async () => {
    const id = await nuevoKa(a);
    await registrarIntervencion(claimsDe(a), id, { tipo: "libre", descripcion: "Escobillas", fecha: "2026-01-02", km: "63000" });
    const lecturas = await db.lecturaKilometraje.findMany({ where: { vehiculoId: id }, orderBy: { id: "asc" } });
    expect(lecturas.map((l) => l.kilometraje)).toEqual([62400, 63000]);
    expect(lecturas[1]!.fecha).toEqual(fechaDeHoy());
    expect((await estadoDelVehiculo(claimsDe(a), id))!.kmActual).toBe(63000);
  });

  it("con menos km que la última lectura no agrega lectura", async () => {
    const id = await nuevoKa(a);
    await registrarIntervencion(claimsDe(a), id, { tipo: "libre", descripcion: "Viejo", fecha: "2020-05-01", km: "30000" });
    expect(await db.lecturaKilometraje.count({ where: { vehiculoId: id } })).toBe(1);
  });

  it("rechaza un ítem que no es del plan del vehículo, sin escribir nada", async () => {
    const id = await nuevoKa(a);
    const ajeno = await db.itemMantenimiento.findFirstOrThrow({ where: { modeloId: { not: kaId } } });
    const r = await registrarIntervencion(claimsDe(a), id, {
      tipo: "catalogo", itemId: String(ajeno.id), fecha: hoy(), km: "70000",
    });
    expect(r).toEqual({ ok: false, errores: { itemId: "Ese trabajo no está en el plan de este vehículo." } });
    expect(await db.intervencion.count({ where: { vehiculoId: id, origen: "registrada" } })).toBe(0);
    expect(await db.lecturaKilometraje.count({ where: { vehiculoId: id } })).toBe(1);
  });

  it("un vehículo fuera del catálogo solo admite trabajos libres", async () => {
    const r = await crearVehiculo(claimsDe(a), { tipo: "libre", marca: "Peugeot", modelo: "208", anio: 2019 }, 41000);
    const id = r.ok ? r.valor.id : "";
    expect(await registrarIntervencion(claimsDe(a), id, { tipo: "catalogo", itemId: String(aceite), fecha: hoy(), km: "41000" }))
      .toEqual({ ok: false, errores: { tipo: "Este vehículo no tiene plan: elegí «Otro trabajo»." } });
    expect((await registrarIntervencion(claimsDe(a), id, { tipo: "libre", descripcion: "Aceite", fecha: hoy(), km: "41000" })).ok).toBe(true);
  });

  it("devuelve los errores de validación sin tocar la base", async () => {
    const id = await nuevoKa(a);
    expect(await registrarIntervencion(claimsDe(a), id, { tipo: "libre", descripcion: "", fecha: "", km: "" })).toEqual({
      ok: false,
      errores: { descripcion: "Describí el trabajo.", fecha: "Ingresá la fecha.", km: "Ingresá el kilometraje." },
    });
  });

  it("no registra en el vehículo de otro propietario (RLS)", async () => {
    const id = await nuevoKa(a);
    const r = await registrarIntervencion(claimsDe(b), id, { tipo: "libre", descripcion: "x", fecha: hoy(), km: "1" });
    expect(r).toEqual({ ok: false, errores: { formulario: "No encontramos el vehículo." } });
    expect(await registrarIntervencion(claimsDe(a), "no-es-un-uuid", { tipo: "libre", descripcion: "x", fecha: hoy(), km: "1" }))
      .toEqual({ ok: false, errores: { formulario: "No encontramos el vehículo." } });
  });

  it("devuelve los ítems que cambiaron de estado", async () => {
    const id = await nuevoKa(a, 74000); // aceite supuesto a 60.000 → próximo a los 74.000
    expect((await filaDe(a, id, "Aceite y filtro de aceite")).estado).toBe("proximo");
    const r = await registrarIntervencion(claimsDe(a), id, { tipo: "catalogo", itemId: String(aceite), fecha: hoy(), km: "74000" });
    expect(r.ok && r.valor.cambios).toEqual([{ itemId: aceite, nombre: "Aceite y filtro de aceite", estado: "al_dia" }]);
  });
});

describe("supuestosDelVehiculo con trabajos registrados (spec 3.1)", () => {
  it("no ofrece confirmar un ítem que ya tiene un trabajo registrado", async () => {
    const id = await nuevoKa(a);
    const antes = (await supuestosDelVehiculo(claimsDe(a), id))!.supuestos.map((s) => s.itemId);
    expect(antes).toContain(aceite);
    await registrarIntervencion(claimsDe(a), id, { tipo: "catalogo", itemId: String(aceite), fecha: hoy(), km: "62400" });
    const despues = (await supuestosDelVehiculo(claimsDe(a), id))!.supuestos.map((s) => s.itemId);
    expect(despues).not.toContain(aceite);
    expect(despues).toHaveLength(antes.length - 1);
  });
});

const SIN_TRABAJO = { ok: false, errores: { formulario: "Ese trabajo ya no existe. Volvé al historial." } };

async function conTrabajo(usuario: string) {
  const id = await nuevoKa(usuario);
  const r = await registrarIntervencion(claimsDe(usuario), id, {
    tipo: "catalogo", itemId: String(aceite), fecha: hoy(), km: "62400", taller: "Lubri", costo: "85.000",
  });
  if (!r.ok) throw new Error("No se pudo registrar el trabajo de prueba");
  return { vehiculoId: id, trabajoId: r.valor.id };
}

describe("editarIntervencion (CU-12)", () => {
  it("cambia fecha, km, taller y costo, y recalcula", async () => {
    const { vehiculoId, trabajoId } = await conTrabajo(a);
    const r = await editarIntervencion(claimsDe(a), vehiculoId, trabajoId, { fecha: hoy(), km: "61000", taller: "", costo: "" });
    expect(r.ok).toBe(true);
    expect(await db.intervencion.findUniqueOrThrow({ where: { id: trabajoId } })).toMatchObject({
      kilometraje: 61000, taller: null, costo: null, itemId: aceite,
    });
    expect((await filaDe(a, vehiculoId, "Aceite y filtro de aceite")).kmVence).toBe(76000);
  });
  it("con más km que la última lectura, también registra la lectura", async () => {
    const { vehiculoId, trabajoId } = await conTrabajo(a);
    await editarIntervencion(claimsDe(a), vehiculoId, trabajoId, { fecha: hoy(), km: "64000" });
    expect((await estadoDelVehiculo(claimsDe(a), vehiculoId))!.kmActual).toBe(64000);
  });
  it("valida como el registro", async () => {
    const { vehiculoId, trabajoId } = await conTrabajo(a);
    expect(await editarIntervencion(claimsDe(a), vehiculoId, trabajoId, { fecha: "2099-01-01", km: "1" })).toEqual({
      ok: false,
      errores: { fecha: "La fecha no puede ser posterior a hoy." },
    });
  });
  it("no edita un supuesto ni el trabajo de otro propietario", async () => {
    const { vehiculoId, trabajoId } = await conTrabajo(a);
    const supuesto = await db.intervencion.findFirstOrThrow({ where: { vehiculoId, origen: { not: "registrada" } } });
    expect(await editarIntervencion(claimsDe(a), vehiculoId, supuesto.id, { fecha: hoy(), km: "1" })).toEqual(SIN_TRABAJO);
    expect(await editarIntervencion(claimsDe(b), vehiculoId, trabajoId, { fecha: hoy(), km: "1" })).toEqual(NO_ENCONTRADO_ESPERADO);
    expect((await db.intervencion.findUniqueOrThrow({ where: { id: trabajoId } })).kilometraje).toBe(62400);
  });
});

const NO_ENCONTRADO_ESPERADO = { ok: false, errores: { formulario: "No encontramos el vehículo." } };

describe("eliminarIntervencion (CU-12 1a)", () => {
  it("borra el trabajo y el ítem vuelve a su supuesto", async () => {
    const { vehiculoId, trabajoId } = await conTrabajo(a);
    expect((await filaDe(a, vehiculoId, "Aceite y filtro de aceite")).incertidumbre).toBeNull();
    const r = await eliminarIntervencion(claimsDe(a), vehiculoId, trabajoId);
    expect(r).toMatchObject({ ok: true, valor: { rutaComprobante: null } });
    expect(await db.intervencion.count({ where: { id: trabajoId } })).toBe(0);
    expect((await filaDe(a, vehiculoId, "Aceite y filtro de aceite")).incertidumbre).toBe("a_confirmar");
    expect((await supuestosDelVehiculo(claimsDe(a), vehiculoId))!.supuestos.map((s) => s.itemId)).toContain(aceite);
  });
  it("con dos trabajos del ítem, vuelve al anterior", async () => {
    const { vehiculoId, trabajoId } = await conTrabajo(a);
    await registrarIntervencion(claimsDe(a), vehiculoId, { tipo: "catalogo", itemId: String(aceite), fecha: hoy(), km: "70000" });
    const nuevo = await db.intervencion.findFirstOrThrow({ where: { vehiculoId, origen: "registrada", kilometraje: 70000 } });
    await eliminarIntervencion(claimsDe(a), vehiculoId, nuevo.id);
    expect((await filaDe(a, vehiculoId, "Aceite y filtro de aceite")).kmVence).toBe(77400);
    expect(await db.intervencion.count({ where: { id: trabajoId } })).toBe(1);
  });
  it("devuelve la ruta del comprobante para borrar el archivo", async () => {
    const { vehiculoId, trabajoId } = await conTrabajo(a);
    await db.comprobante.create({
      data: { intervencionId: trabajoId, rutaArchivo: `${a}/prueba.jpg`, tipoMime: "image/jpeg", tamanoBytes: 1000 },
    });
    const r = await eliminarIntervencion(claimsDe(a), vehiculoId, trabajoId);
    expect(r).toMatchObject({ ok: true, valor: { rutaComprobante: `${a}/prueba.jpg` } });
    expect(await db.comprobante.count({ where: { intervencionId: trabajoId } })).toBe(0);
  });
  it("no elimina un supuesto, un id inexistente ni el trabajo de otro", async () => {
    const { vehiculoId, trabajoId } = await conTrabajo(a);
    const supuesto = await db.intervencion.findFirstOrThrow({ where: { vehiculoId, origen: { not: "registrada" } } });
    expect(await eliminarIntervencion(claimsDe(a), vehiculoId, supuesto.id)).toEqual(SIN_TRABAJO);
    expect(await eliminarIntervencion(claimsDe(a), vehiculoId, "no-es-un-uuid")).toEqual(SIN_TRABAJO);
    expect(await eliminarIntervencion(claimsDe(b), vehiculoId, trabajoId)).toEqual(NO_ENCONTRADO_ESPERADO);
    expect(await db.intervencion.count({ where: { id: trabajoId } })).toBe(1);
  });
});

describe("historialDelVehiculo (CU-13)", () => {
  it("trabajos registrados y supuestos confirmados, del más nuevo al más viejo; sin pendientes", async () => {
    const id = await nuevoKa(a);
    await registrarIntervencion(claimsDe(a), id, { tipo: "libre", descripcion: "Escobillas", fecha: "2026-08-02", km: "60900", costo: "12.500" });
    await registrarIntervencion(claimsDe(a), id, { tipo: "catalogo", itemId: String(aceite), fecha: "2026-10-10", km: "62400" });
    await registrarIntervencion(claimsDe(a), id, { tipo: "libre", descripcion: "Mismo día, más km", fecha: "2026-08-02", km: "61000" });
    const frenos = (await supuestosDelVehiculo(claimsDe(a), id))!.supuestos.find((s) => s.nombre === "Líquido de frenos")!;
    await confirmarSupuesto(claimsDe(a), id, frenos.itemId, "2026-01-05");

    const h = (await historialDelVehiculo(claimsDe(a), id))!;
    expect(h.map((t) => [t.descripcion, t.fecha.toISOString().slice(0, 10), t.km, t.editable])).toEqual([
      ["Aceite y filtro de aceite", "2026-10-10", 62400, true],
      ["Mismo día, más km", "2026-08-02", 61000, true],
      ["Escobillas", "2026-08-02", 60900, true],
      ["Líquido de frenos", "2026-01-05", 45000, false],
    ]);
    expect(h[2]).toMatchObject({ origen: "registrada", costo: "12500", tieneComprobante: false, itemId: null });
    expect(h[3]).toMatchObject({ origen: "supuesta_confirmada" });
  });
  it("vacío para un vehículo sin trabajos; null para uno ajeno o inexistente", async () => {
    const id = await nuevoKa(a);
    expect(await historialDelVehiculo(claimsDe(a), id)).toEqual([]);
    expect(await historialDelVehiculo(claimsDe(b), id)).toBeNull();
    expect(await historialDelVehiculo(claimsDe(a), "no-es-un-uuid")).toBeNull();
  });
});

describe("intervencionDelVehiculo", () => {
  it("trae un trabajo con su comprobante; null si es ajeno o no existe", async () => {
    const { vehiculoId, trabajoId } = await conTrabajo(a);
    await db.comprobante.create({
      data: { intervencionId: trabajoId, rutaArchivo: `${a}/f.png`, tipoMime: "image/png", tamanoBytes: 10 },
    });
    expect(await intervencionDelVehiculo(claimsDe(a), vehiculoId, trabajoId)).toMatchObject({
      descripcion: "Aceite y filtro de aceite", taller: "Lubri", costo: "85000", tieneComprobante: true, rutaComprobante: `${a}/f.png`,
    });
    expect(await intervencionDelVehiculo(claimsDe(b), vehiculoId, trabajoId)).toBeNull();
    expect(await intervencionDelVehiculo(claimsDe(a), vehiculoId, "no-es-un-uuid")).toBeNull();
  });
});

describe("rechazos sin escrituras (menores del plan 3A)", () => {
  const MARCA = `Prueba plan viejo ${Date.now()}`;

  afterAll(async () => {
    // Los usuarios (y sus vehículos) se borran en el afterAll de arriba; este corre antes.
    await db.vehiculo.deleteMany({ where: { modelo: { marca: { nombre: MARCA } } } });
    const marca = await db.marca.findUnique({ where: { nombre: MARCA } });
    if (!marca) return;
    for (const m of await db.modelo.findMany({ where: { marcaId: marca.id } })) {
      await db.planMantenimiento.deleteMany({ where: { modeloId: m.id } });
      await db.itemMantenimiento.deleteMany({ where: { modeloId: m.id } });
    }
    await db.modelo.deleteMany({ where: { marcaId: marca.id } });
    await db.marca.delete({ where: { id: marca.id } });
  });

  /** Modelo propio: plan v1 (reemplazado) con dos ítems y v2 (publicado) con uno solo. */
  async function modeloConPlanViejo(): Promise<{ modeloId: number; itemViejo: number }> {
    const marca = await db.marca.create({ data: { nombre: MARCA } });
    const modelo = await db.modelo.create({ data: { marcaId: marca.id, nombre: "Prueba", anioDesde: 2020 } });
    const [sigue, viejo] = await Promise.all(
      ["Aceite", "Bujías"].map((nombre) => db.itemMantenimiento.create({ data: { modeloId: modelo.id, nombre, tipo: "reemplazo" } })),
    );
    await db.planMantenimiento.create({
      data: {
        modeloId: modelo.id,
        version: 1,
        estado: "reemplazado",
        intervalos: { create: [sigue, viejo].map((i) => ({ itemId: i.id, intervaloKm: 10000 })) },
      },
    });
    await db.planMantenimiento.create({
      data: { modeloId: modelo.id, version: 2, estado: "publicado", intervalos: { create: [{ itemId: sigue.id, intervaloKm: 10000 }] } },
    });
    return { modeloId: modelo.id, itemViejo: viejo.id };
  }

  it("un registro rechazado no deja los supuestos que creó el cálculo", async () => {
    const r0 = await crearVehiculo(claimsDe(a), { tipo: "catalogo", modeloId: kaId, anio: 2014 }, 62400);
    const id = r0.ok ? r0.valor.id : "";
    // El alta ya guarda los supuestos; se borran para ver si el registro rechazado los vuelve a dejar.
    await db.intervencion.deleteMany({ where: { vehiculoId: id } });
    const r = await registrarIntervencion(claimsDe(a), id, { tipo: "catalogo", itemId: "999999", fecha: hoy(), km: "62400" });
    expect(r).toMatchObject({ ok: false, errores: { itemId: "Ese trabajo no está en el plan de este vehículo." } });
    expect(await db.intervencion.count({ where: { vehiculoId: id } })).toBe(0);
  });

  it("un ítem de una versión vieja del plan se rechaza", async () => {
    const { modeloId, itemViejo } = await modeloConPlanViejo();
    const r0 = await crearVehiculo(claimsDe(a), { tipo: "catalogo", modeloId, anio: 2020 }, 1000);
    const id = r0.ok ? r0.valor.id : "";
    const r = await registrarIntervencion(claimsDe(a), id, { tipo: "catalogo", itemId: String(itemViejo), fecha: hoy(), km: "1000" });
    expect(r).toMatchObject({ ok: false, errores: { itemId: "Ese trabajo no está en el plan de este vehículo." } });
    expect(await db.intervencion.count({ where: { vehiculoId: id, origen: "registrada" } })).toBe(0);
  });
});
