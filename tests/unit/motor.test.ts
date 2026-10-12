import { describe, expect, it } from "vitest";
import { kmSupuesto, sumarMeses } from "@/dominio/motor";

const d = (s: string) => new Date(`${s}T00:00:00Z`);

describe("sumarMeses", () => {
  it("suma meses de calendario", () => {
    expect(sumarMeses(d("2026-03-10"), 12)).toEqual(d("2027-03-10"));
  });
  it("cruza el año", () => {
    expect(sumarMeses(d("2026-11-15"), 3)).toEqual(d("2027-02-15"));
  });
  it("si el día no existe en el mes de destino, toma el último", () => {
    expect(sumarMeses(d("2026-01-31"), 1)).toEqual(d("2026-02-28"));
  });
  it("29 de febrero más un año es 28 de febrero", () => {
    expect(sumarMeses(d("2024-02-29"), 12)).toEqual(d("2025-02-28"));
  });
});

describe("kmSupuesto (RF-09)", () => {
  it("ubica el supuesto en el múltiplo anterior al km de alta", () => {
    expect(kmSupuesto(15_000, 62_400)).toBe(60_000);
    expect(kmSupuesto(45_000, 62_400)).toBe(45_000);
  });
  it("si el alta cae justo en un múltiplo, el supuesto queda ahí", () => {
    expect(kmSupuesto(15_000, 45_000)).toBe(45_000);
  });
  it("no hay supuesto si el alta no supera el intervalo", () => {
    expect(kmSupuesto(90_000, 62_400)).toBeNull();
    expect(kmSupuesto(15_000, 15_000)).toBeNull();
  });
});
