import { describe, expect, it } from "vitest";
import { esRutaDeIngreso, esRutaPublica } from "@/lib/rutas";

describe("rutas", () => {
  it("las pantallas de cuenta y el enlace del correo son públicas", () => {
    for (const r of ["/ingresar", "/crear-cuenta", "/recuperar", "/auth/confirmar"]) {
      expect(esRutaPublica(r)).toBe(true);
    }
  });

  it("la pantalla para elegir contraseña nueva exige la sesión que crea el enlace", () => {
    expect(esRutaPublica("/recuperar/nueva")).toBe(false);
  });

  it("el resto exige sesión", () => {
    for (const r of ["/", "/vehiculos", "/cuenta", "/admin"]) expect(esRutaPublica(r)).toBe(false);
  });

  it("identifica las pantallas de ingreso, que no tienen sentido con sesión", () => {
    expect(esRutaDeIngreso("/ingresar")).toBe(true);
    expect(esRutaDeIngreso("/crear-cuenta")).toBe(true);
    expect(esRutaDeIngreso("/recuperar")).toBe(true);
    expect(esRutaDeIngreso("/vehiculos")).toBe(false);
  });
});
