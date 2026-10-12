import { describe, expect, it } from "vitest";
import { validarConfirmacion, validarCorreccion } from "@/dominio/supuestos";

const hoy = new Date("2026-10-12T00:00:00Z");

describe("validarConfirmacion (CU-06 paso 2)", () => {
  it("acepta una fecha hasta hoy", () => {
    expect(validarConfirmacion({ fecha: "2026-03-10", hoy })).toEqual({ ok: true, fecha: new Date("2026-03-10T00:00:00Z") });
    expect(validarConfirmacion({ fecha: "2026-10-12", hoy }).ok).toBe(true);
  });
  it("exige la fecha", () => {
    expect(validarConfirmacion({ fecha: "", hoy })).toEqual({ ok: false, errores: { fecha: "Ingresá la fecha." } });
  });
  it("rechaza una fecha posterior a hoy (2d)", () => {
    expect(validarConfirmacion({ fecha: "2026-10-13", hoy })).toEqual({
      ok: false,
      errores: { fecha: "La fecha no puede ser posterior a hoy." },
    });
  });
  it("rechaza una fecha mal formada", () => {
    expect(validarConfirmacion({ fecha: "10/03/2026", hoy }).ok).toBe(false);
    expect(validarConfirmacion({ fecha: "2026-02-30", hoy }).ok).toBe(false);
  });
});

describe("validarCorreccion (CU-06 2a)", () => {
  it("acepta km hasta la lectura actual, con puntos de miles", () => {
    expect(validarCorreccion({ km: "58.000", fecha: "2026-05-02", kmActual: 62_400, hoy })).toEqual({
      ok: true,
      km: 58_000,
      fecha: new Date("2026-05-02T00:00:00Z"),
    });
  });
  it("rechaza km mayores a la lectura actual (2d)", () => {
    expect(validarCorreccion({ km: "63000", fecha: "2026-05-02", kmActual: 62_400, hoy })).toEqual({
      ok: false,
      errores: { km: "No puede superar 62.400 km, la lectura actual." },
    });
  });
  it("rechaza km no válidos y junta los errores de los dos campos", () => {
    expect(validarCorreccion({ km: "abc", fecha: "", kmActual: 62_400, hoy })).toEqual({
      ok: false,
      errores: { km: "Ingresá un kilometraje válido.", fecha: "Ingresá la fecha." },
    });
  });
});
