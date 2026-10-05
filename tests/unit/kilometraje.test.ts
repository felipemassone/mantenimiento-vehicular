import { describe, expect, it } from "vitest";
import { formatearKm, validarNuevaLectura } from "@/dominio/kilometraje";

describe("formatearKm", () => {
  it("usa punto de miles, como en Argentina", () => {
    expect(formatearKm(62400)).toBe("62.400");
    expect(formatearKm(0)).toBe("0");
  });
});

describe("validarNuevaLectura (RF-07)", () => {
  it("acepta la primera lectura del vehículo", () => {
    expect(validarNuevaLectura(null, 62400)).toEqual({ ok: true });
  });

  it("acepta un auto 0 km", () => {
    expect(validarNuevaLectura(null, 0)).toEqual({ ok: true });
  });

  it("acepta una lectura igual a la última", () => {
    expect(validarNuevaLectura(62400, 62400)).toEqual({ ok: true });
  });

  it("acepta una lectura mayor", () => {
    expect(validarNuevaLectura(62400, 63000)).toEqual({ ok: true });
  });

  it("rechaza una lectura menor indicando el mínimo admitido (CU-08, 4a)", () => {
    expect(validarNuevaLectura(62400, 61900)).toEqual({
      ok: false,
      mensaje: "No puede ser menor a 62.400 km, la última lectura.",
    });
  });

  it("rechaza valores negativos o no enteros", () => {
    expect(validarNuevaLectura(null, -1)).toEqual({
      ok: false,
      mensaje: "Ingresá un kilometraje válido.",
    });
    expect(validarNuevaLectura(null, 100.5)).toEqual({
      ok: false,
      mensaje: "Ingresá un kilometraje válido.",
    });
  });
});
