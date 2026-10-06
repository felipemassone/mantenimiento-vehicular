import { describe, expect, it } from "vitest";
import {
  erroresDe,
  esquemaCrearCuenta,
  esquemaNuevaContrasena,
  iniciales,
  rutaSegura,
} from "@/dominio/cuenta";

describe("esquemaCrearCuenta (RF-01, CU-01 4b)", () => {
  it("acepta un correo válido y 8 caracteres", () => {
    expect(esquemaCrearCuenta.safeParse({ email: "propietario@example.com", contrasena: "12345678" }).success).toBe(true);
  });

  it("rechaza una contraseña de menos de 8 caracteres con el mensaje de la ficha", () => {
    const r = esquemaCrearCuenta.safeParse({ email: "propietario@example.com", contrasena: "1234" });
    expect(r.success).toBe(false);
    expect(erroresDe(r.error!)).toEqual({ contrasena: "La contraseña tiene que tener al menos 8 caracteres." });
  });

  it("rechaza un correo con formato inválido", () => {
    const r = esquemaCrearCuenta.safeParse({ email: "no-es-un-correo", contrasena: "12345678" });
    expect(erroresDe(r.error!)).toEqual({ email: "Ingresá un correo electrónico válido." });
  });

  it("normaliza el correo a minúsculas y sin espacios", () => {
    const r = esquemaCrearCuenta.parse({ email: "  Propietario@Example.com ", contrasena: "12345678" });
    expect(r.email).toBe("propietario@example.com");
  });
});

describe("esquemaNuevaContrasena (CU-03 paso 4)", () => {
  it("exige que las dos contraseñas coincidan", () => {
    const r = esquemaNuevaContrasena.safeParse({ contrasena: "12345678", repetida: "12345679" });
    expect(erroresDe(r.error!)).toEqual({ repetida: "Las contraseñas no coinciden." });
  });
});

describe("iniciales", () => {
  it("toma la inicial de cada parte del nombre de usuario", () => {
    expect(iniciales("felipe.massone@example.com")).toBe("FM");
  });

  it("si no hay partes, toma las dos primeras letras", () => {
    expect(iniciales("propietario7@example.com")).toBe("PR");
  });
});

describe("rutaSegura", () => {
  it("acepta rutas internas", () => {
    expect(rutaSegura("/recuperar/nueva", "/vehiculos")).toBe("/recuperar/nueva");
  });

  it("rechaza destinos externos o ambiguos", () => {
    expect(rutaSegura("https://otro.sitio", "/vehiculos")).toBe("/vehiculos");
    expect(rutaSegura("//otro.sitio", "/vehiculos")).toBe("/vehiculos");
    expect(rutaSegura("/\\otro.sitio", "/vehiculos")).toBe("/vehiculos");
    expect(rutaSegura(null, "/vehiculos")).toBe("/vehiculos");
  });
});
