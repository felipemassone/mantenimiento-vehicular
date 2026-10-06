import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { conUsuario } from "@/datos/cliente-usuario";
import { prismaPrivilegiado } from "@/datos/privilegiado";
import { asignarRol, borrarUsuarioPrueba, claimsDe, crearUsuarioPrueba } from "./ayudantes";

let propietario: string;
let admin: string;
let marcaId: number;
let modeloId: number;

beforeAll(async () => {
  propietario = await crearUsuarioPrueba("cat-prop");
  admin = await crearUsuarioPrueba("cat-admin");
  await asignarRol(admin, 2);
  const marca = await prismaPrivilegiado.marca.create({ data: { nombre: `Prueba ${Date.now()}` } });
  marcaId = marca.id;
  const modelo = await prismaPrivilegiado.modelo.create({
    data: {
      marcaId,
      nombre: "Modelo de prueba",
      anioDesde: 2020,
      planes: {
        create: [
          { version: 1, estado: "publicado", fechaPublicacion: new Date() },
          { version: 2, estado: "borrador" },
        ],
      },
    },
  });
  modeloId = modelo.id;
});

afterAll(async () => {
  await prismaPrivilegiado.planMantenimiento.deleteMany({ where: { modeloId } });
  await prismaPrivilegiado.modelo.deleteMany({ where: { id: modeloId } });
  await prismaPrivilegiado.marca.deleteMany({ where: { id: marcaId } });
  await borrarUsuarioPrueba(propietario);
  await borrarUsuarioPrueba(admin);
});

describe("RLS del catálogo", () => {
  it("el propietario ve el plan publicado pero no el borrador", async () => {
    const planes = await conUsuario(claimsDe(propietario), (tx) =>
      tx.planMantenimiento.findMany({ where: { modeloId } }),
    );
    expect(planes.map((p) => p.version)).toEqual([1]);
  });

  it("el administrador de catálogo ve también el borrador", async () => {
    const planes = await conUsuario(claimsDe(admin), (tx) =>
      tx.planMantenimiento.findMany({ where: { modeloId }, orderBy: { version: "asc" } }),
    );
    expect(planes.map((p) => p.version)).toEqual([1, 2]);
  });

  it("el propietario no puede escribir el catálogo", async () => {
    await expect(
      conUsuario(claimsDe(propietario), (tx) =>
        tx.marca.create({ data: { nombre: `Intrusa ${Date.now()}` } }),
      ),
    ).rejects.toThrow();
  });

  it("el administrador de catálogo sí puede", async () => {
    const m = await conUsuario(claimsDe(admin), (tx) =>
      tx.modelo.update({ where: { id: modeloId }, data: { anioHasta: 2024 } }),
    );
    expect(m.anioHasta).toBe(2024);
  });

  it("nadie puede darse un rol a sí mismo", async () => {
    await expect(
      conUsuario(claimsDe(propietario), (tx) =>
        tx.usuarioRol.create({ data: { usuarioId: propietario, rolId: 2 } }),
      ),
    ).rejects.toThrow();
  });
});
