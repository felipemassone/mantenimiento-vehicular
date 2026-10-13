import { describe, expect, it } from "vitest";
import { ordenarHistorial, validarEdicion, validarIntervencion } from "@/dominio/intervencion";

const hoy = new Date("2026-10-13T00:00:00Z");
const base = { tipo: "catalogo", itemId: "7", fecha: "2026-10-10", km: "62.400", taller: "", costo: "" };

describe("validarIntervencion (CU-10)", () => {
  it("un trabajo del plan con lo mínimo", () => {
    expect(validarIntervencion(base, hoy)).toEqual({
      ok: true,
      datos: { tipo: "catalogo", itemId: 7, fecha: new Date("2026-10-10T00:00:00Z"), km: 62400, taller: null, costo: null },
    });
  });
  it("un trabajo libre con taller y costo", () => {
    const r = validarIntervencion(
      { tipo: "libre", descripcion: "  Cambio de escobillas ", fecha: "2026-10-13", km: "60900", taller: " Lubri ", costo: "12.500,5" },
      hoy,
    );
    expect(r).toEqual({
      ok: true,
      datos: { tipo: "libre", descripcion: "Cambio de escobillas", fecha: hoy, km: 60900, taller: "Lubri", costo: "12500.5" },
    });
  });
  it("una fecha anterior al alta vale; una futura no", () => {
    expect(validarIntervencion({ ...base, fecha: "2019-01-01" }, hoy).ok).toBe(true);
    expect(validarIntervencion({ ...base, fecha: "2026-10-14" }, hoy)).toEqual({
      ok: false,
      errores: { fecha: "La fecha no puede ser posterior a hoy." },
    });
  });
  it("el kilometraje es obligatorio, entero y mayor a 0", () => {
    expect(validarIntervencion({ ...base, km: "" }, hoy)).toMatchObject({ errores: { km: "Ingresá el kilometraje." } });
    expect(validarIntervencion({ ...base, km: "0" }, hoy)).toMatchObject({ errores: { km: "Ingresá un kilometraje mayor a 0." } });
    expect(validarIntervencion({ ...base, km: "12,5" }, hoy)).toMatchObject({ errores: { km: "Ingresá un kilometraje válido." } });
    expect(validarIntervencion({ ...base, km: "2.000.001" }, hoy)).toMatchObject({ errores: { km: "Ingresá un kilometraje válido." } });
    expect(validarIntervencion({ ...base, km: "3000000000" }, hoy)).toMatchObject({ errores: { km: "Ingresá un kilometraje válido." } });
    expect(validarIntervencion({ ...base, km: "2.000.000" }, hoy)).toMatchObject({ ok: true });
  });
  it("tipo, ítem y descripción", () => {
    expect(validarIntervencion({ ...base, tipo: "" }, hoy)).toMatchObject({ errores: { tipo: "Elegí el tipo de trabajo." } });
    expect(validarIntervencion({ ...base, itemId: "" }, hoy)).toMatchObject({ errores: { itemId: "Elegí el trabajo del plan." } });
    expect(validarIntervencion({ ...base, tipo: "libre", descripcion: "  " }, hoy)).toMatchObject({
      errores: { descripcion: "Describí el trabajo." },
    });
    expect(validarIntervencion({ ...base, tipo: "libre", descripcion: "x".repeat(201) }, hoy)).toMatchObject({
      errores: { descripcion: "La descripción no puede superar 200 caracteres." },
    });
  });
  it("taller de hasta 120 caracteres", () => {
    expect(validarIntervencion({ ...base, taller: "x".repeat(121) }, hoy)).toMatchObject({
      errores: { taller: "El taller no puede superar 120 caracteres." },
    });
  });
  it("costo en formato argentino", () => {
    const costo = (c: string) => validarIntervencion({ ...base, costo: c }, hoy);
    expect(costo("85.000")).toMatchObject({ datos: { costo: "85000" } });
    expect(costo("$ 85.000,50")).toMatchObject({ datos: { costo: "85000.50" } });
    expect(costo("0")).toMatchObject({ datos: { costo: "0" } });
    const error = { errores: { costo: "Ingresá un costo válido, por ejemplo 85.000 o 85.000,50." } };
    expect(costo("85.5")).toMatchObject(error);
    expect(costo("1.000.000,999")).toMatchObject(error);
    expect(costo("-3")).toMatchObject(error);
    expect(costo("10.000.000.000")).toMatchObject({ errores: { costo: "El costo no puede superar $ 9.999.999.999,99." } });
  });
  it("junta todos los errores", () => {
    const r = validarIntervencion({ tipo: "catalogo", itemId: "", fecha: "", km: "" }, hoy);
    expect(r).toEqual({
      ok: false,
      errores: { itemId: "Elegí el trabajo del plan.", fecha: "Ingresá la fecha.", km: "Ingresá el kilometraje." },
    });
  });
});

describe("validarEdicion (CU-12)", () => {
  it("valida solo fecha, km, taller y costo", () => {
    expect(validarEdicion({ fecha: "2026-10-01", km: "61000", taller: "", costo: "1.500" }, hoy)).toEqual({
      ok: true,
      datos: { fecha: new Date("2026-10-01T00:00:00Z"), km: 61000, taller: null, costo: "1500" },
    });
    expect(validarEdicion({ fecha: "", km: "" }, hoy)).toEqual({
      ok: false,
      errores: { fecha: "Ingresá la fecha.", km: "Ingresá el kilometraje." },
    });
  });
});

describe("km y valores que no son texto", () => {
  const km = (v: unknown) => validarIntervencion({ ...base, km: v }, hoy);
  it("rechaza los puntos de miles mal puestos", () => {
    expect(km("62.4")).toMatchObject({ ok: false, errores: { km: "Ingresá un kilometraje válido." } });
  });
  it("acepta un número", () => {
    expect(km(62400)).toMatchObject({ ok: true, datos: { km: 62400 } });
  });
  it("un valor que no es texto ni número es inválido, no vacío", () => {
    expect(km({})).toMatchObject({ ok: false, errores: { km: "Ingresá un kilometraje válido." } });
    expect(validarIntervencion({ ...base, taller: ["x"] }, hoy)).toMatchObject({ ok: false, errores: { taller: "Ingresá un taller válido." } });
    expect(validarIntervencion({ ...base, costo: true }, hoy)).toMatchObject({ ok: false, errores: { costo: expect.stringContaining("85.000") } });
    expect(validarIntervencion({ ...base, fecha: 20261010 }, hoy)).toMatchObject({ ok: false, errores: { fecha: "Ingresá una fecha válida." } });
    expect(validarIntervencion({ tipo: "libre", descripcion: Symbol("x"), fecha: "2026-10-10", km: "1" }, hoy)).toMatchObject({
      ok: false,
      errores: { descripcion: "Ingresá una descripción válida." },
    });
  });
});

describe("ordenarHistorial (CU-13)", () => {
  const t = (id: string, fecha: string, km: number, registrado = "2026-10-13T10:00:00Z") => ({
    id,
    fecha: new Date(fecha),
    km,
    registrado: new Date(registrado),
  });
  it("fecha descendente, después km descendente, después el registrado último", () => {
    const filas = [
      t("viejo", "2025-01-10", 40000),
      t("mismo-dia-menos-km", "2026-10-10", 62000),
      t("nuevo", "2026-10-11", 62500),
      t("mismo-dia-mas-km", "2026-10-10", 62400),
      t("empate-primero", "2026-10-10", 62000, "2026-10-13T09:00:00Z"),
    ];
    expect(ordenarHistorial(filas).map((f) => f.id)).toEqual([
      "nuevo",
      "mismo-dia-mas-km",
      "mismo-dia-menos-km",
      "empate-primero",
      "viejo",
    ]);
    expect(filas[0].id).toBe("viejo"); // no modifica la entrada
  });
});
