import { describe, expect, it } from "vitest";
import {
  coincideConRuta,
  leerComprobante,
  rutaDelComprobante,
  rutaPropia,
  TAMANO_MAXIMO,
  validarArchivo,
} from "@/dominio/comprobante";

const yo = "6f1c2a7e-1111-4222-8333-944455556666";
const otro = "0a0b0c0d-1111-4222-8333-944455556666";
const archivo = "1d2e3f40-aaaa-4bbb-8ccc-dddddddddddd";

describe("validarArchivo (CU-11 2a)", () => {
  it("acepta JPG y PNG hasta 5 MB", () => {
    expect(validarArchivo({ tipo: "image/jpeg", tamano: 1 })).toEqual({ ok: true, tipo: "image/jpeg" });
    expect(validarArchivo({ tipo: "image/png", tamano: TAMANO_MAXIMO })).toEqual({ ok: true, tipo: "image/png" });
  });
  it("rechaza otros tipos, archivos vacíos y más de 5 MB", () => {
    expect(validarArchivo({ tipo: "application/pdf", tamano: 10 })).toEqual({
      ok: false,
      error: "El comprobante tiene que ser una imagen JPG o PNG.",
    });
    expect(validarArchivo({ tipo: "toString", tamano: 10 })).toMatchObject({ ok: false });
    expect(validarArchivo({ tipo: "image/png", tamano: 0 })).toEqual({ ok: false, error: "El archivo está vacío." });
    expect(validarArchivo({ tipo: "image/png", tamano: TAMANO_MAXIMO + 1 })).toEqual({
      ok: false,
      error: "El comprobante no puede superar 5 MB.",
    });
  });
});

describe("rutas", () => {
  it("arma {usuario}/{id}.{ext}", () => {
    expect(rutaDelComprobante(yo, archivo, "image/jpeg")).toBe(`${yo}/${archivo}.jpg`);
    expect(rutaDelComprobante(yo, archivo, "image/png")).toBe(`${yo}/${archivo}.png`);
  });
  it("rutaPropia acepta solo rutas bien formadas de la carpeta de quien la manda", () => {
    expect(rutaPropia(`${yo}/${archivo}.png`, yo)).toBe(`${yo}/${archivo}.png`);
    for (const r of [`${otro}/${archivo}.png`, `${yo}/${archivo}.gif`, `${yo}/../${otro}/${archivo}.png`, `${yo}/x.png`, 42, null]) {
      expect(rutaPropia(r, yo)).toBeNull();
    }
  });
  it("coincideConRuta compara la extensión con el tipo real", () => {
    expect(coincideConRuta(`${yo}/${archivo}.png`, "image/png")).toBe(true);
    expect(coincideConRuta(`${yo}/${archivo}.jpg`, "image/png")).toBe(false);
  });
});

describe("leerComprobante", () => {
  it("sin campos, se mantiene; con quitarComprobante, se quita; con ruta, se pone", () => {
    expect(leerComprobante({}, yo)).toEqual({ ok: true, cambio: { accion: "mantener" } });
    expect(leerComprobante({ comprobante: "" }, yo)).toEqual({ ok: true, cambio: { accion: "mantener" } });
    expect(leerComprobante({ quitarComprobante: "1" }, yo)).toEqual({ ok: true, cambio: { accion: "quitar" } });
    expect(leerComprobante({ comprobante: `${yo}/${archivo}.jpg` }, yo)).toEqual({
      ok: true,
      cambio: { accion: "poner", ruta: `${yo}/${archivo}.jpg` },
    });
  });
  it("una ruta ajena o mal formada es un error del campo", () => {
    expect(leerComprobante({ comprobante: `${otro}/${archivo}.jpg` }, yo)).toEqual({
      ok: false,
      error: "No pudimos usar ese comprobante. Volvé a adjuntarlo.",
    });
  });
});
