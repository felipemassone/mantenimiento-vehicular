import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { conUsuario } from "@/datos/cliente-usuario";
import { borrarCarpeta, editarTrabajo, eliminarTrabajo, enlaceDelComprobante, registrarTrabajo } from "@/datos/comprobantes";
import { estadoDelVehiculo } from "@/datos/estado";
import { historialDelVehiculo } from "@/datos/intervenciones";
import { prismaPrivilegiado as db, supabaseAdmin } from "@/datos/privilegiado";
import { crearVehiculo } from "@/datos/vehiculos";
import { BUCKET, TAMANO_MAXIMO } from "@/dominio/comprobante";
import { fechaDeHoy } from "@/dominio/fechas";
import { subirComprobante } from "@/lib/comprobantes";
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

/** Sube un PNG con la sesión del usuario y devuelve la ruta (falla la prueba si no pudo). */
async function subir(usuario: string, bytes?: number): Promise<string> {
  const r = await subirComprobante(await sesionDe(usuario), usuario, pngDe(bytes));
  if (!r.ok) throw new Error(r.error);
  return r.ruta;
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

describe("comprobante de un trabajo (CU-11)", () => {
  it("se sube, se guarda con tipo y tamaño de Storage y se ve con un enlace de 60 s", async () => {
    const id = await nuevoKa(a);
    const ca = await sesionDe(a);
    const s = await subirComprobante(ca, a, pngDe(200));
    expect(s.ok).toBe(true);
    const ruta = s.ok ? s.ruta : "";
    expect((await registrarTrabajo(claimsDe(a), ca, id, { ...aceite(), comprobante: ruta })).ok).toBe(true);
    const fila = await db.comprobante.findFirstOrThrow({ where: { intervencion: { vehiculoId: id } } });
    expect(fila).toMatchObject({ rutaArchivo: ruta, tipoMime: "image/png", tamanoBytes: 200 });
    const [t] = (await historialDelVehiculo(claimsDe(a), id))!;
    expect(t.tieneComprobante).toBe(true);
    const url = await enlaceDelComprobante(ca, ruta);
    expect(url).toMatch(/token=/);
    const resp = await fetch(url!);
    expect(resp.status).toBe(200);
    expect(resp.headers.get("content-type")).toBe("image/png");
    expect(await enlaceDelComprobante(await sesionDe(b), ruta)).toBeNull();
  });

  it("subirComprobante valida antes de subir (2a)", async () => {
    expect(await subirComprobante(await sesionDe(a), a, new Blob(["x"], { type: "application/pdf" }))).toEqual({
      ok: false,
      error: "El comprobante tiene que ser una imagen JPG o PNG.",
    });
  });

  it("un registro rechazado no escribe nada y borra el archivo subido (RNF-07)", async () => {
    const id = await nuevoKa(a);
    const ruta = await subir(a);
    const r = await registrarTrabajo(claimsDe(a), await sesionDe(a), id, { ...aceite(), km: "99.0", comprobante: ruta });
    expect(r).toMatchObject({ ok: false, errores: { km: "Ingresá un kilometraje válido." } });
    expect(await existe(ruta)).toBe(false);
  });

  it("una ruta propia sin archivo se rechaza sin escribir el trabajo ni la lectura", async () => {
    const id = await nuevoKa(a);
    const r = await registrarTrabajo(claimsDe(a), await sesionDe(a), id, {
      ...aceite(),
      km: "70000",
      comprobante: `${a}/${randomUUID()}.png`,
    });
    expect(r).toMatchObject({ ok: false, errores: { comprobante: "No encontramos el comprobante. Volvé a adjuntarlo." } });
    expect(await db.intervencion.count({ where: { vehiculoId: id, origen: "registrada" } })).toBe(0);
    expect(await db.lecturaKilometraje.count({ where: { vehiculoId: id, kilometraje: 70000 } })).toBe(0);
  });

  it("la ruta de otro usuario se rechaza y su archivo no se toca", async () => {
    const ajena = await subir(b);
    const id = await nuevoKa(a);
    const r = await registrarTrabajo(claimsDe(a), await sesionDe(a), id, { ...aceite(), comprobante: ajena });
    expect(r).toMatchObject({ ok: false, errores: { comprobante: "No pudimos usar ese comprobante. Volvé a adjuntarlo." } });
    expect(await existe(ajena)).toBe(true);
  });

  it("una ruta que ya usa otro trabajo se rechaza y el archivo sigue", async () => {
    const id = await nuevoKa(a);
    const ca = await sesionDe(a);
    const ruta = await subir(a);
    expect((await registrarTrabajo(claimsDe(a), ca, id, { ...aceite(), comprobante: ruta })).ok).toBe(true);
    const otra = await registrarTrabajo(claimsDe(a), ca, id, { ...libre(), comprobante: ruta });
    expect(otra).toMatchObject({ ok: false, errores: { comprobante: "Ese comprobante ya está en otro trabajo." } });
    expect(await existe(ruta)).toBe(true);
    expect(await db.intervencion.count({ where: { vehiculoId: id, origen: "registrada" } })).toBe(1);
  });

  it("reemplazar borra el archivo viejo; quitar borra la fila y el archivo; un cambio rechazado conserva el viejo", async () => {
    const id = await nuevoKa(a);
    const ca = await sesionDe(a);
    const r1 = await subir(a);
    const r = await registrarTrabajo(claimsDe(a), ca, id, { ...aceite(), comprobante: r1 });
    const trabajo = r.ok ? r.valor.id : "";

    const r2 = await subir(a);
    expect((await editarTrabajo(claimsDe(a), ca, id, trabajo, { ...comunes(), km: "abc", comprobante: r2 })).ok).toBe(false);
    expect(await existe(r1)).toBe(true);
    expect(await existe(r2)).toBe(false);

    const r3 = await subir(a);
    expect(await editarTrabajo(claimsDe(a), ca, id, trabajo, { ...comunes(), comprobante: r3 })).toMatchObject({
      ok: true,
      valor: { rutaAnterior: r1 },
    });
    expect(await existe(r1)).toBe(false);
    expect((await db.comprobante.findFirstOrThrow({ where: { intervencionId: trabajo } })).rutaArchivo).toBe(r3);

    expect((await editarTrabajo(claimsDe(a), ca, id, trabajo, comunes())).ok).toBe(true);
    expect(await existe(r3)).toBe(true); // sin campos de comprobante, se conserva

    expect((await editarTrabajo(claimsDe(a), ca, id, trabajo, { ...comunes(), quitarComprobante: "1" })).ok).toBe(true);
    expect(await db.comprobante.count({ where: { intervencionId: trabajo } })).toBe(0);
    expect(await existe(r3)).toBe(false);
  });

  it("eliminar el trabajo borra el comprobante y su archivo", async () => {
    const id = await nuevoKa(a);
    const ca = await sesionDe(a);
    const ruta = await subir(a);
    const r = await registrarTrabajo(claimsDe(a), ca, id, { ...aceite(), comprobante: ruta });
    expect((await eliminarTrabajo(claimsDe(a), ca, id, r.ok ? r.valor.id : "")).ok).toBe(true);
    expect(await db.comprobante.count({ where: { rutaArchivo: ruta } })).toBe(0);
    expect(await existe(ruta)).toBe(false);
  });

  it("la base no deja guardar una fila que apunte a la carpeta de otro", async () => {
    const id = await nuevoKa(a);
    const r = await registrarTrabajo(claimsDe(a), await sesionDe(a), id, aceite());
    const intento = conUsuario(claimsDe(a), (tx) =>
      tx.comprobante.create({
        data: {
          intervencionId: r.ok ? r.valor.id : "",
          rutaArchivo: `${b}/${randomUUID()}.png`,
          tipoMime: "image/png",
          tamanoBytes: 10,
        },
      }),
    );
    await expect(intento).rejects.toThrow();
  });

  it("borrarCarpeta deja vacía la carpeta del usuario (RF-04)", async () => {
    for (let i = 0; i < 3; i++) await subir(c);
    expect(await borrarCarpeta(await sesionDe(c), c)).toBe(true);
    expect((await supabaseAdmin().storage.from(BUCKET).list(c)).data).toEqual([]);
  });

  it("borrarCarpeta con la sesión de otro no borra nada", async () => {
    const ruta = await subir(c);
    await borrarCarpeta(await sesionDe(b), c); // la RLS le muestra la carpeta vacía
    expect(await existe(ruta)).toBe(true);
  });
});
