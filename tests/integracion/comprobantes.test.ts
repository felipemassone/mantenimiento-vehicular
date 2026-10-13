import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { estadoDelVehiculo } from "@/datos/estado";
import { prismaPrivilegiado as db, supabaseAdmin } from "@/datos/privilegiado";
import { crearVehiculo } from "@/datos/vehiculos";
import { BUCKET, TAMANO_MAXIMO } from "@/dominio/comprobante";
import { fechaDeHoy } from "@/dominio/fechas";
import { sembrar } from "../../prisma/seed";
import { borrarUsuarioPrueba, claimsDe, crearUsuarioPrueba, pngDe, sesionDe } from "./ayudantes";

let a: string;
let b: string;
let c: string;
let kaId: number;
let aceiteId: number;

const hoy = () => fechaDeHoy().toISOString().slice(0, 10);
const aceite = () => ({ tipo: "catalogo", itemId: String(aceiteId), fecha: hoy(), km: "62400" });
const libre = () => ({ tipo: "libre", descripcion: "Escobillas", fecha: hoy(), km: "62400" });
const comunes = () => ({ fecha: hoy(), km: "62400" });

beforeAll(async () => {
  await sembrar();
  kaId = (await db.modelo.findFirstOrThrow({ where: { nombre: "Ka", marca: { nombre: "Ford" } } })).id;
  aceiteId = (await db.itemMantenimiento.findFirstOrThrow({ where: { modeloId: kaId, nombre: "Aceite y filtro de aceite" } })).id;
  a = await crearUsuarioPrueba("comprobantes-a");
  b = await crearUsuarioPrueba("comprobantes-b");
  c = await crearUsuarioPrueba("comprobantes-c");
});

afterAll(async () => {
  await borrarUsuarioPrueba(a);
  await borrarUsuarioPrueba(b);
  await borrarUsuarioPrueba(c);
});

async function nuevoKa(usuario: string): Promise<string> {
  const r = await crearVehiculo(claimsDe(usuario), { tipo: "catalogo", modeloId: kaId, anio: 2014 }, 62400);
  if (!r.ok) throw new Error("No se pudo crear el Ka de prueba");
  await estadoDelVehiculo(claimsDe(usuario), r.valor.id);
  return r.valor.id;
}

async function existe(ruta: string): Promise<boolean> {
  const filas = await db.$queryRaw<unknown[]>`SELECT 1 FROM storage.objects WHERE bucket_id = ${BUCKET} AND name = ${ruta}`;
  return filas.length === 1;
}

describe("bucket comprobantes (spec 4)", () => {
  it("es privado, con 5 MB y JPG/PNG", async () => {
    const { data } = await supabaseAdmin().storage.getBucket(BUCKET);
    expect(data).toMatchObject({ public: false, file_size_limit: 5242880, allowed_mime_types: ["image/jpeg", "image/png"] });
  });

  it("Storage rechaza otro tipo o más de 5 MB aunque no se use la app", async () => {
    const ca = await sesionDe(a);
    const pdf = await ca.storage.from(BUCKET).upload(`${a}/${randomUUID()}.png`, new Blob(["%PDF"]), { contentType: "application/pdf" });
    expect(pdf.error).not.toBeNull();
    const grande = await ca.storage
      .from(BUCKET)
      .upload(`${a}/${randomUUID()}.png`, pngDe(TAMANO_MAXIMO + 1), { contentType: "image/png" });
    expect(grande.error).not.toBeNull();
  });

  it("cada uno sube, lee y borra solo en su carpeta", async () => {
    const ca = await sesionDe(a);
    const cb = await sesionDe(b);
    const ruta = `${a}/${randomUUID()}.png`;
    expect((await ca.storage.from(BUCKET).upload(ruta, pngDe(), { contentType: "image/png" })).error).toBeNull();
    expect((await cb.storage.from(BUCKET).upload(`${a}/${randomUUID()}.png`, pngDe(), { contentType: "image/png" })).error).not.toBeNull();
    expect((await cb.storage.from(BUCKET).createSignedUrl(ruta, 60)).error).not.toBeNull();
    await cb.storage.from(BUCKET).remove([ruta]);
    expect(await existe(ruta)).toBe(true);
    expect((await ca.storage.from(BUCKET).remove([ruta])).data).toHaveLength(1);
    expect(await existe(ruta)).toBe(false);
  });
});

