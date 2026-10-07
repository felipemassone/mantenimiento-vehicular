import { describe, expect, it } from "vitest";
import { fechaDeHoy, formatearFecha } from "@/dominio/fechas";

describe("fechaDeHoy", () => {
  it("usa el día de Argentina aunque en UTC ya sea el día siguiente", () => {
    // 7/10/2026 23:30 en Buenos Aires = 8/10/2026 02:30 UTC
    const d = fechaDeHoy(new Date("2026-10-08T02:30:00Z"));
    expect(d.toISOString()).toBe("2026-10-07T00:00:00.000Z");
  });

  it("de día coincide con la fecha UTC", () => {
    expect(fechaDeHoy(new Date("2026-03-14T15:00:00Z")).toISOString()).toBe("2026-03-14T00:00:00.000Z");
  });
});

describe("formatearFecha", () => {
  it("devuelve dd/mm/aaaa", () => {
    expect(formatearFecha(new Date("2026-03-14T00:00:00Z"))).toBe("14/03/2026");
  });
});
