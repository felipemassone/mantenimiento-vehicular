import { describe, expect, it } from "vitest";
import {
  parsearIntervalo,
  parsearItem,
  parsearModelo,
  rangosSeSuperponen,
  validarPublicacion,
} from "@/dominio/catalogo";

describe("parsearModelo (CU-15 pasos 3–4)", () => {
  it("acepta marca, modelo y rango; el año final es opcional", () => {
    expect(parsearModelo({ marca: " Renault ", nombre: "Sandero", anioDesde: "2015", anioHasta: "" })).toEqual({
      ok: true,
      datos: { marca: "Renault", nombre: "Sandero", anioDesde: 2015, anioHasta: null },
    });
  });

  it("rechaza un año inicial posterior al final (4a)", () => {
    expect(parsearModelo({ marca: "Renault", nombre: "Sandero", anioDesde: "2022", anioHasta: "2015" })).toEqual({
      ok: false,
      errores: { anioHasta: "El año final no puede ser anterior al inicial." },
    });
  });

  it("exige marca y modelo", () => {
    const r = parsearModelo({ marca: "", nombre: "", anioDesde: "2015", anioHasta: "" });
    expect(r).toEqual({ ok: false, errores: { marca: "Ingresá la marca.", nombre: "Ingresá el modelo." } });
  });
});

describe("parsearItem (CU-16 paso 3, 3b)", () => {
  it("acepta un ítem con km y meses opcionales", () => {
    expect(parsearItem({ nombre: "Aceite", tipo: "reemplazo", km: "15.000", meses: "12" })).toEqual({
      ok: true,
      datos: { nombre: "Aceite", tipo: "reemplazo", km: 15000, meses: 12 },
    });
    expect(parsearItem({ nombre: "Bujías", tipo: "reemplazo", km: "45000", meses: "" })).toMatchObject({
      ok: true,
      datos: { meses: null },
    });
  });

  it("exige nombre, tipo e intervalo en km mayor que cero", () => {
    const r = parsearItem({ nombre: "", tipo: "", km: "0", meses: "" });
    expect(r).toEqual({
      ok: false,
      errores: {
        nombre: "Ingresá el nombre del ítem.",
        tipo: "Elegí si se cambia o se revisa.",
        km: "Ingresá un intervalo en km mayor que cero.",
      },
    });
  });
});

describe("parsearIntervalo", () => {
  it("rechaza meses en cero", () => {
    expect(parsearIntervalo({ km: "15000", meses: "0" })).toEqual({
      ok: false,
      errores: { meses: "Ingresá meses mayores que cero o dejalo vacío." },
    });
  });
});

describe("rangosSeSuperponen (CU-15 paso 4)", () => {
  it("detecta la superposición, con años abiertos", () => {
    expect(rangosSeSuperponen([2015, 2022], [2013, 2019])).toBe(true);
    expect(rangosSeSuperponen([2020, 2022], [2013, 2019])).toBe(false);
    expect(rangosSeSuperponen([2025, null], [2013, null])).toBe(true);
    expect(rangosSeSuperponen([2010, 2012], [2013, null])).toBe(false);
  });
});

describe("validarPublicacion (RF-20, CU-17 2a)", () => {
  it("exige al menos un ítem", () => {
    expect(validarPublicacion([])).toEqual(["El plan tiene que tener al menos un ítem."]);
  });

  it("rechaza intervalos no positivos e ítems duplicados", () => {
    expect(
      validarPublicacion([
        { nombre: "Aceite", km: 15000, meses: 12 },
        { nombre: "aceite ", km: 10000, meses: null },
        { nombre: "Frenos", km: 0, meses: null },
      ]),
    ).toEqual(["“aceite” está repetido.", "“Frenos” tiene un intervalo en km no válido."]);
  });

  it("un plan correcto no tiene errores", () => {
    expect(validarPublicacion([{ nombre: "Aceite", km: 15000, meses: 12 }])).toEqual([]);
  });
});
