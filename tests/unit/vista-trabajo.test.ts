import { describe, expect, it } from "vitest";
import {
  costoParaCampo,
  detalleDelTrabajo,
  fechaParaCampo,
  formatearCosto,
  formatearTamano,
  leerCambios,
  rutaFichaConCambios,
} from "@/dominio/vista-trabajo";

describe("formatearCosto (DESIGN.md: $ 85.000)", () => {
  it("pesos enteros con punto de miles", () => {
    expect(formatearCosto("85000")).toBe("$ 85.000");
    expect(formatearCosto("85000.00")).toBe("$ 85.000");
    expect(formatearCosto("0")).toBe("$ 0");
    expect(formatearCosto("9999999999.99")).toBe("$ 9.999.999.999,99");
  });
  it("centavos con coma y dos cifras", () => {
    expect(formatearCosto("85000.5")).toBe("$ 85.000,50");
    expect(formatearCosto("12.05")).toBe("$ 12,05");
  });
});

describe("costoParaCampo", () => {
  it("vuelve al formato que lee el formulario", () => {
    expect(costoParaCampo("85000.50")).toBe("85.000,50");
    expect(costoParaCampo("85000.00")).toBe("85.000");
    expect(costoParaCampo(null)).toBe("");
  });
});

describe("fechaParaCampo", () => {
  it("aaaa-mm-dd en UTC, como espera <input type=date>", () => {
    expect(fechaParaCampo(new Date("2026-03-04T00:00:00Z"))).toBe("2026-03-04");
  });
});

describe("formatearTamano", () => {
  it("KB por debajo de 1 MB, redondeando hacia arriba", () => {
    expect(formatearTamano(1)).toBe("1 KB");
    expect(formatearTamano(850 * 1024)).toBe("850 KB");
    expect(formatearTamano(1024 * 1024 - 1)).toBe("1024 KB");
  });
  it("MB con un decimal y coma", () => {
    expect(formatearTamano(1024 * 1024)).toBe("1,0 MB");
    expect(formatearTamano(1.2 * 1024 * 1024)).toBe("1,2 MB");
  });
});

describe("detalleDelTrabajo (mockup 16)", () => {
  it("km y taller, o solo km", () => {
    expect(detalleDelTrabajo({ km: 62400, taller: "Lubricentro San Martín" })).toBe("62.400 km · Lubricentro San Martín");
    expect(detalleDelTrabajo({ km: 60900, taller: null })).toBe("60.900 km");
  });
});

describe("leerCambios (aviso de la ficha por URL)", () => {
  it("lee los ids de ítem", () => {
    expect(leerCambios("3,5")).toEqual([3, 5]);
  });
  it("ignora lo inválido y los repetidos", () => {
    expect(leerCambios("0,-1,a,3,3,1.5")).toEqual([3]);
    expect(leerCambios(undefined)).toEqual([]);
    expect(leerCambios(["3", "5"])).toEqual([]);
  });
  it("a lo sumo 50", () => {
    const muchos = Array.from({ length: 80 }, (_, i) => i + 1).join(",");
    expect(leerCambios(muchos)).toHaveLength(50);
  });
});

describe("rutaFichaConCambios", () => {
  it("sin cambios, la ficha sola", () => {
    expect(rutaFichaConCambios("v1", [])).toBe("/vehiculos/v1");
  });
  it("con cambios, en el parámetro", () => {
    expect(rutaFichaConCambios("v1", [{ itemId: 3 }, { itemId: 5 }])).toBe("/vehiculos/v1?cambios=3,5");
  });
});
