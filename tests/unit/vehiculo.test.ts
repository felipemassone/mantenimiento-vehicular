import { describe, expect, it } from "vitest";
import {
  aniosDelModelo,
  formatearIntervalo,
  nombreVehiculo,
  parsearVehiculo,
  validarAnioDelModelo,
} from "@/dominio/vehiculo";

describe("parsearVehiculo (CU-05 pasos 3–4)", () => {
  it("acepta un vehículo del catálogo con kilometraje con punto de miles", () => {
    const r = parsearVehiculo({ tipo: "catalogo", modeloId: "3", anio: "2014", kilometraje: "62.400" }, true);
    expect(r).toEqual({ ok: true, datos: { tipo: "catalogo", modeloId: 3, anio: 2014 }, kilometraje: 62400 });
  });

  it("acepta un auto 0 km", () => {
    const r = parsearVehiculo({ tipo: "catalogo", modeloId: "3", anio: "2026", kilometraje: "0" }, true);
    expect(r.ok && r.kilometraje).toBe(0);
  });

  it("un kilometraje vacío no se toma como 0", () => {
    const r = parsearVehiculo({ tipo: "catalogo", modeloId: "3", anio: "2014", kilometraje: "" }, true);
    expect(r).toEqual({ ok: false, errores: { kilometraje: "Ingresá un kilometraje válido." } });
  });

  it("rechaza un kilometraje negativo o con decimales", () => {
    expect(parsearVehiculo({ tipo: "catalogo", modeloId: "3", anio: "2014", kilometraje: "-5" }, true).ok).toBe(false);
    expect(parsearVehiculo({ tipo: "catalogo", modeloId: "3", anio: "2014", kilometraje: "100,5" }, true).ok).toBe(false);
  });

  it("exige elegir modelo y año", () => {
    const r = parsearVehiculo({ tipo: "catalogo", modeloId: "", anio: "", kilometraje: "1000" }, true);
    expect(r).toEqual({ ok: false, errores: { modeloId: "Elegí un modelo.", anio: "Elegí el año." } });
  });

  it("acepta un modelo libre (CU-05 3a) y recorta espacios", () => {
    const r = parsearVehiculo({ tipo: "libre", marca: " Peugeot ", modelo: "208", anio: "2019", kilometraje: "41000" }, true);
    expect(r).toEqual({ ok: true, datos: { tipo: "libre", marca: "Peugeot", modelo: "208", anio: 2019 }, kilometraje: 41000 });
  });

  it("en el modelo libre exige marca y modelo", () => {
    const r = parsearVehiculo({ tipo: "libre", marca: "", modelo: " ", anio: "2019", kilometraje: "1" }, true);
    expect(r).toEqual({ ok: false, errores: { marca: "Ingresá la marca.", modelo: "Ingresá el modelo." } });
  });

  it("sin kilometraje (edición, CU-07) no lo pide", () => {
    const r = parsearVehiculo({ tipo: "catalogo", modeloId: "3", anio: "2014" }, false);
    expect(r).toEqual({ ok: true, datos: { tipo: "catalogo", modeloId: 3, anio: 2014 }, kilometraje: null });
  });
});

describe("validarAnioDelModelo (CU-05 4a)", () => {
  it("acepta un año dentro del rango", () => {
    expect(validarAnioDelModelo(2014, 2008, 2016)).toEqual({ ok: true });
  });

  it("rechaza un año fuera del rango indicando el rango", () => {
    expect(validarAnioDelModelo(2018, 2008, 2016)).toEqual({ ok: false, mensaje: "Este modelo está cargado de 2008 a 2016." });
    expect(validarAnioDelModelo(2005, 2010, null)).toEqual({ ok: false, mensaje: "Este modelo está cargado desde 2010." });
  });
});

describe("aniosDelModelo", () => {
  it("lista del más nuevo al más viejo; sin año final llega al año siguiente", () => {
    expect(aniosDelModelo(2014, 2016, 2026)).toEqual([2016, 2015, 2014]);
    expect(aniosDelModelo(2024, null, 2026)).toEqual([2027, 2026, 2025, 2024]);
  });
});

describe("nombreVehiculo", () => {
  it("usa el catálogo o los datos libres", () => {
    expect(nombreVehiculo({ marca: "Ford", modelo: "Ka" })).toBe("Ford Ka");
    expect(nombreVehiculo({ marcaLibre: "Peugeot", modeloLibre: "208" })).toBe("Peugeot 208");
  });
});

describe("formatearIntervalo", () => {
  it("km y meses, lo que ocurra primero", () => {
    expect(formatearIntervalo(15000, 12)).toBe("cada 15.000 km o 12 meses");
    expect(formatearIntervalo(90000, null)).toBe("cada 90.000 km");
  });
});
