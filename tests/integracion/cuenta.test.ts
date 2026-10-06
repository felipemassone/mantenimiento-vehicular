import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { rolesDelUsuario } from "@/datos/cuenta";
import { asignarRol, borrarUsuarioPrueba, claimsDe, crearUsuarioPrueba } from "./ayudantes";

let propietario: string;
let admin: string;

beforeAll(async () => {
  propietario = await crearUsuarioPrueba("roles-p");
  admin = await crearUsuarioPrueba("roles-a");
  await asignarRol(admin, 2);
});

afterAll(async () => {
  await borrarUsuarioPrueba(propietario);
  await borrarUsuarioPrueba(admin);
});

describe("rolesDelUsuario", () => {
  it("un usuario nuevo es solo propietario", async () => {
    expect(await rolesDelUsuario(claimsDe(propietario))).toEqual(["propietario"]);
  });

  it("lee los roles adicionales, ordenados", async () => {
    expect(await rolesDelUsuario(claimsDe(admin))).toEqual(["administrador_catalogo", "propietario"]);
  });
});
