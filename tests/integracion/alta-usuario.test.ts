import { afterAll, describe, expect, it } from "vitest";
import { conUsuario } from "@/datos/cliente-usuario";
import { prismaPrivilegiado } from "@/datos/privilegiado";
import { borrarUsuarioPrueba, claimsDe, crearUsuarioPrueba } from "./ayudantes";

const creados: string[] = [];
afterAll(async () => {
  for (const id of creados) await borrarUsuarioPrueba(id);
});

describe("alta automática del usuario (spec 4.3)", () => {
  it("crea la fila en usuario con el rol propietario", async () => {
    const id = await crearUsuarioPrueba("alta");
    creados.push(id);

    const usuario = await prismaPrivilegiado.usuario.findUnique({
      where: { id },
      include: { roles: { include: { rol: true } } },
    });
    expect(usuario?.roles.map((r) => r.rol.nombre)).toEqual(["propietario"]);
  });

  it("el usuario ve su propia fila y no la de otro", async () => {
    const a = await crearUsuarioPrueba("ver-a");
    const b = await crearUsuarioPrueba("ver-b");
    creados.push(a, b);

    const visibles = await conUsuario(claimsDe(a), (tx) => tx.usuario.findMany());
    expect(visibles.map((u) => u.id)).toEqual([a]);
  });

  it("al borrar la cuenta de autenticación se borra en cascada (RF-04)", async () => {
    const id = await crearUsuarioPrueba("cascada");
    await borrarUsuarioPrueba(id);
    expect(await prismaPrivilegiado.usuario.findUnique({ where: { id } })).toBeNull();
  });
});
