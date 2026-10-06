import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { conUsuario } from "@/datos/cliente-usuario";
import { borrarUsuarioPrueba, claimsDe, crearUsuarioPrueba } from "./ayudantes";

let a: string;
let b: string;
let vehiculoDeA: string;

beforeAll(async () => {
  a = await crearUsuarioPrueba("rls-a");
  b = await crearUsuarioPrueba("rls-b");
  const v = await conUsuario(claimsDe(a), (tx) =>
    tx.vehiculo.create({
      data: {
        usuarioId: a,
        marcaLibre: "Peugeot",
        modeloLibre: "208",
        anio: 2019,
        lecturas: { create: { kilometraje: 41000, fecha: new Date("2026-03-14") } },
      },
    }),
  );
  vehiculoDeA = v.id;
});

afterAll(async () => {
  await borrarUsuarioPrueba(a);
  await borrarUsuarioPrueba(b);
});

describe("RLS de vehículos y lecturas (RNF-04, OWASP A01)", () => {
  it("el dueño ve su vehículo y su lectura", async () => {
    const vs = await conUsuario(claimsDe(a), (tx) => tx.vehiculo.findMany({ include: { lecturas: true } }));
    expect(vs).toHaveLength(1);
    expect(vs[0]?.lecturas[0]?.kilometraje).toBe(41000);
  });

  it("otro usuario no ve el vehículo ni sus lecturas", async () => {
    const vs = await conUsuario(claimsDe(b), (tx) => tx.vehiculo.findMany());
    const ls = await conUsuario(claimsDe(b), (tx) => tx.lecturaKilometraje.findMany());
    expect(vs).toEqual([]);
    expect(ls).toEqual([]);
  });

  it("otro usuario no puede modificarlo ni borrarlo", async () => {
    const mod = await conUsuario(claimsDe(b), (tx) =>
      tx.vehiculo.updateMany({ where: { id: vehiculoDeA }, data: { anio: 2000 } }),
    );
    const bor = await conUsuario(claimsDe(b), (tx) =>
      tx.vehiculo.deleteMany({ where: { id: vehiculoDeA } }),
    );
    expect(mod.count).toBe(0);
    expect(bor.count).toBe(0);
  });

  it("otro usuario no puede crear un vehículo a nombre del dueño", async () => {
    await expect(
      conUsuario(claimsDe(b), (tx) =>
        tx.vehiculo.create({ data: { usuarioId: a, marcaLibre: "Fiat", modeloLibre: "Uno", anio: 2010 } }),
      ),
    ).rejects.toThrow();
  });

  it("otro usuario no puede agregar lecturas al vehículo ajeno", async () => {
    await expect(
      conUsuario(claimsDe(b), (tx) =>
        tx.lecturaKilometraje.create({
          data: { vehiculoId: vehiculoDeA, kilometraje: 99999, fecha: new Date("2026-03-15") },
        }),
      ),
    ).rejects.toThrow();
  });
});
