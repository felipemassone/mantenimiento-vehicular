import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { rolesDelUsuario } from "@/datos/cuenta";
import { prismaPrivilegiado } from "@/datos/privilegiado";
import { buscarCuenta, cambiarRolCatalogo } from "@/datos/roles";
import { asignarRol, borrarUsuarioPrueba, claimsDe, crearUsuarioPrueba, sesionDe } from "./ayudantes";

let tecnico: string;
let otro: string;
let correoOtro: string;

beforeAll(async () => {
  tecnico = await crearUsuarioPrueba("roles-t");
  otro = await crearUsuarioPrueba("roles-o");
  await asignarRol(tecnico, 3);
  correoOtro = (await prismaPrivilegiado.usuario.findUniqueOrThrow({ where: { id: otro } })).email;
});

afterAll(async () => {
  await borrarUsuarioPrueba(tecnico);
  await borrarUsuarioPrueba(otro);
});

describe("buscarCuenta (CU-18)", () => {
  it("encuentra por correo exacto, sin distinguir mayúsculas ni espacios", async () => {
    const r = await buscarCuenta(claimsDe(tecnico), { email: `  ${correoOtro.toUpperCase()} ` });
    expect(r).toEqual({ ok: true, valor: { id: otro, email: correoOtro, roles: ["propietario"] } });
  });

  it("sin coincidencia lo informa (1a)", async () => {
    const r = await buscarCuenta(claimsDe(tecnico), { email: "nadie-con-este-correo@example.com" });
    expect(r).toEqual({ ok: false, errores: { email: "No hay ninguna cuenta con ese correo." } });
  });

  it("no hace búsqueda parcial ni interpreta comodines", async () => {
    const [usuario, dominio] = correoOtro.split("@");
    for (const email of [`${usuario.slice(0, -2)}@${dominio}`, `${usuario.slice(0, -2)}%@${dominio}`, `_${usuario.slice(1)}@${dominio}`]) {
      expect((await buscarCuenta(claimsDe(tecnico), { email })).ok).toBe(false);
    }
  });

  it("un correo inválido se rechaza antes de ir a la base", async () => {
    expect(await buscarCuenta(claimsDe(tecnico), { email: "otro@" })).toEqual({
      ok: false,
      errores: { email: "Ingresá un correo electrónico válido." },
    });
  });

  it("quien no es técnico no puede buscar (lo rechaza la base)", async () => {
    await expect(buscarCuenta(claimsDe(otro), { email: correoOtro })).rejects.toThrow(/administrador técnico/);
  });
});

describe("cambiarRolCatalogo (CU-18, RF-21)", () => {
  it("otorga el rol y rige en el pedido siguiente (RNF-05)", async () => {
    const r = await cambiarRolCatalogo(claimsDe(tecnico), { usuarioId: otro, otorgar: "1" });
    expect(r).toEqual({ ok: true, valor: ["administrador_catalogo", "propietario"] });
    expect(await rolesDelUsuario(claimsDe(otro))).toEqual(["administrador_catalogo", "propietario"]);
  });

  it("otorgar dos veces no duplica ni falla", async () => {
    const r = await cambiarRolCatalogo(claimsDe(tecnico), { usuarioId: otro, otorgar: "1" });
    expect(r).toEqual({ ok: true, valor: ["administrador_catalogo", "propietario"] });
    expect(await prismaPrivilegiado.usuarioRol.count({ where: { usuarioId: otro } })).toBe(2);
  });

  it("revoca solo el rol de catálogo; revocar de nuevo no falla", async () => {
    for (let i = 0; i < 2; i++) {
      const r = await cambiarRolCatalogo(claimsDe(tecnico), { usuarioId: otro, otorgar: "0" });
      expect(r).toEqual({ ok: true, valor: ["propietario"] });
    }
  });

  it("no toca los roles del técnico al revocarse a sí mismo el de catálogo", async () => {
    const r = await cambiarRolCatalogo(claimsDe(tecnico), { usuarioId: tecnico, otorgar: "0" });
    expect(r).toEqual({ ok: true, valor: ["administrador_tecnico", "propietario"] });
  });

  it("cuenta inexistente o id mal formado → no encontrada", async () => {
    const esperado = { ok: false, errores: { usuarioId: "No encontramos la cuenta." } };
    expect(await cambiarRolCatalogo(claimsDe(tecnico), { usuarioId: "0f8fad5b-d9cb-469f-a165-70867728950e", otorgar: "1" })).toEqual(esperado);
    expect(await cambiarRolCatalogo(claimsDe(tecnico), { usuarioId: "x", otorgar: "1" })).toEqual(esperado);
  });

  it("quien no es técnico no puede cambiar roles, ni el suyo", async () => {
    await expect(cambiarRolCatalogo(claimsDe(otro), { usuarioId: otro, otorgar: "1" })).rejects.toThrow(/administrador técnico/);
    expect(await rolesDelUsuario(claimsDe(otro))).toEqual(["propietario"]);
  });
});

describe("funciones expuestas por la API REST de Supabase", () => {
  it("sin sesión no se pueden ejecutar", async () => {
    const anonimo = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: false },
    });
    const { data, error } = await anonimo.rpc("buscar_cuenta", { correo: correoOtro });
    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });

  it("un propietario con sesión tampoco", async () => {
    const sesion = await sesionDe(otro);
    expect((await sesion.rpc("buscar_cuenta", { correo: correoOtro })).error).not.toBeNull();
    expect((await sesion.rpc("cambiar_rol_catalogo", { usuario: otro, otorgar: true })).error).not.toBeNull();
    expect(await rolesDelUsuario(claimsDe(otro))).toEqual(["propietario"]);
  });
});
