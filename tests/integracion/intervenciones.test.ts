import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { estadoDelVehiculo, supuestosDelVehiculo } from "@/datos/estado";
import { registrarIntervencion } from "@/datos/intervenciones";
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
