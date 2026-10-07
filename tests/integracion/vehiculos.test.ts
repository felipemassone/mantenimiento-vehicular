import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  actualizarVehiculo,
  catalogoPublicado,
  crearVehiculo,
  eliminarVehiculo,
  listarVehiculos,
  obtenerVehiculo,
  registrarLectura,
} from "@/datos/vehiculos";
import { prismaPrivilegiado as db } from "@/datos/privilegiado";
import { sembrar } from "../../prisma/seed";
import { borrarUsuarioPrueba, claimsDe, crearUsuarioPrueba } from "./ayudantes";

let a: string;
let b: string;
let kaId: number;

beforeAll(async () => {
  await sembrar();
  kaId = (await db.modelo.findFirstOrThrow({ where: { nombre: "Ka", marca: { nombre: "Ford" } } })).id;
  a = await crearUsuarioPrueba("veh-a");
  b = await crearUsuarioPrueba("veh-b");
});

afterAll(async () => {
  await borrarUsuarioPrueba(a);
  await borrarUsuarioPrueba(b);
});

describe("catálogo publicado (CU-05 paso 2)", () => {
  it("incluye el Ford Ka con su rango de años", async () => {
    const marcas = await catalogoPublicado(claimsDe(a));
    const ford = marcas.find((m) => m.nombre === "Ford");
    expect(ford?.modelos).toContainEqual({ id: kaId, nombre: "Ka", anioDesde: 2014, anioHasta: 2014 });
  });
});

describe("alta (CU-05)", () => {
  it("registra un Ford Ka con su primera lectura", async () => {
    const r = await crearVehiculo(claimsDe(a), { tipo: "catalogo", modeloId: kaId, anio: 2014 }, 62400);
    expect(r.ok).toBe(true);
    const lista = await listarVehiculos(claimsDe(a));
    expect(lista).toHaveLength(1);
    expect(lista[0]).toMatchObject({ nombre: "Ford Ka", anio: 2014, kilometraje: 62400, catalogado: true });
  });

  it("rechaza un año fuera del rango del modelo (4a)", async () => {
    const r = await crearVehiculo(claimsDe(a), { tipo: "catalogo", modeloId: kaId, anio: 2010 }, 1000);
    expect(r).toEqual({ ok: false, errores: { anio: "Este modelo está cargado de 2014 a 2014." } });
  });

  it("rechaza un modelo que no existe o no tiene plan publicado", async () => {
    const r = await crearVehiculo(claimsDe(a), { tipo: "catalogo", modeloId: 999999, anio: 2014 }, 1000);
    expect(r).toEqual({ ok: false, errores: { modeloId: "Elegí un modelo de la lista." } });
  });

  it("registra un modelo libre (3a) sin plan", async () => {
    const r = await crearVehiculo(claimsDe(a), { tipo: "libre", marca: "Peugeot", modelo: "208", anio: 2019 }, 41000);
    expect(r.ok).toBe(true);
    const detalle = await obtenerVehiculo(claimsDe(a), r.ok ? r.valor : "");
    expect(detalle).toMatchObject({ nombre: "Peugeot 208", catalogado: false, plan: null });
  });
});

describe("ficha", () => {
  it("trae el plan publicado del modelo con sus 8 ítems", async () => {
    const [ka] = (await listarVehiculos(claimsDe(a))).filter((v) => v.catalogado);
    const detalle = await obtenerVehiculo(claimsDe(a), ka!.id);
    expect(detalle?.plan?.items).toHaveLength(8);
    expect(detalle?.plan?.items).toContainEqual({
      nombre: "Aceite y filtro de aceite",
      tipo: "reemplazo",
      km: 15000,
      meses: 12,
    });
  });

  it("un id que no es un uuid devuelve null en lugar de fallar", async () => {
    expect(await obtenerVehiculo(claimsDe(a), "no-es-un-uuid")).toBeNull();
  });
});

describe("kilometraje (CU-08, RF-07)", () => {
  it("rechaza una lectura menor indicando el mínimo", async () => {
    const [ka] = (await listarVehiculos(claimsDe(a))).filter((v) => v.catalogado);
    const r = await registrarLectura(claimsDe(a), ka!.id, 61900);
    expect(r).toEqual({ ok: false, errores: { kilometraje: "No puede ser menor a 62.400 km, la última lectura." } });
  });

  it("acepta una lectura mayor y pasa a ser la última", async () => {
    const [ka] = (await listarVehiculos(claimsDe(a))).filter((v) => v.catalogado);
    expect((await registrarLectura(claimsDe(a), ka!.id, 63000)).ok).toBe(true);
    const [actual] = (await listarVehiculos(claimsDe(a))).filter((v) => v.catalogado);
    expect(actual?.kilometraje).toBe(63000);
  });

  it("dos lecturas simultáneas no dejan el odómetro hacia atrás", async () => {
    const [ka] = (await listarVehiculos(claimsDe(a))).filter((v) => v.catalogado);
    await Promise.all([registrarLectura(claimsDe(a), ka!.id, 64000), registrarLectura(claimsDe(a), ka!.id, 63500)]);
    const lecturas = await db.lecturaKilometraje.findMany({ where: { vehiculoId: ka!.id }, orderBy: { id: "asc" } });
    const kms = lecturas.map((l) => l.kilometraje);
    expect(kms).toEqual([...kms].sort((x, y) => x - y));
  });
});

describe("edición y baja (CU-07)", () => {
  it("edita los datos del modelo libre", async () => {
    const libre = (await listarVehiculos(claimsDe(a))).find((v) => !v.catalogado)!;
    const r = await actualizarVehiculo(claimsDe(a), libre.id, {
      tipo: "libre",
      marca: "Peugeot",
      modelo: "208 GT",
      anio: 2020,
    });
    expect(r.ok).toBe(true);
    expect((await obtenerVehiculo(claimsDe(a), libre.id))?.nombre).toBe("Peugeot 208 GT");
  });

  it("eliminar borra el vehículo y sus lecturas (cascada)", async () => {
    const libre = (await listarVehiculos(claimsDe(a))).find((v) => !v.catalogado)!;
    expect(await eliminarVehiculo(claimsDe(a), libre.id)).toBe(true);
    expect(await db.lecturaKilometraje.count({ where: { vehiculoId: libre.id } })).toBe(0);
  });
});

describe("aislamiento entre usuarios (RNF-04)", () => {
  it("otro usuario no ve, edita, actualiza ni elimina el vehículo", async () => {
    const [ka] = await listarVehiculos(claimsDe(a));
    expect(await listarVehiculos(claimsDe(b))).toEqual([]);
    expect(await obtenerVehiculo(claimsDe(b), ka!.id)).toBeNull();
    const edicion = await actualizarVehiculo(claimsDe(b), ka!.id, { tipo: "libre", marca: "X", modelo: "Y", anio: 2000 });
    expect(edicion.ok).toBe(false);
    expect((await registrarLectura(claimsDe(b), ka!.id, 999999)).ok).toBe(false);
    expect(await eliminarVehiculo(claimsDe(b), ka!.id)).toBe(false);
    expect((await obtenerVehiculo(claimsDe(a), ka!.id))?.kilometraje).not.toBe(999999);
  });
});
