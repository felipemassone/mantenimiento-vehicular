import { describe, expect, it } from "vitest";
import { erroresDe } from "@/dominio/cuenta";
import { esquemaCambiarRol } from "@/dominio/roles";

const ID = "0f8fad5b-d9cb-469f-a165-70867728950e";

describe("esquemaCambiarRol (CU-18, RF-21)", () => {
  it('"1" otorga y "0" revoca', () => {
    expect(esquemaCambiarRol.parse({ usuarioId: ID, otorgar: "1" })).toEqual({ usuarioId: ID, otorgar: true });
    expect(esquemaCambiarRol.parse({ usuarioId: ID, otorgar: "0" })).toEqual({ usuarioId: ID, otorgar: false });
  });

  it("rechaza un id que no es uuid", () => {
    const r = esquemaCambiarRol.safeParse({ usuarioId: "1 OR 1=1", otorgar: "1" });
    expect(erroresDe(r.error!)).toEqual({ usuarioId: "No encontramos la cuenta." });
  });

  it("rechaza cualquier otro valor de otorgar", () => {
    for (const otorgar of ["si", "", undefined, true]) {
      expect(esquemaCambiarRol.safeParse({ usuarioId: ID, otorgar }).success).toBe(false);
    }
  });
});
