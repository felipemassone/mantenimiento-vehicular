import { describe, expect, it } from "vitest";
import { msDesde } from "@/lib/tiempo-pedido";
import { duracionMs, leerLinea, resumir } from "../carga/estadistica";

describe("tiempo del pedido en el servidor (RNF-02, PS-07)", () => {
  it("mide desde el inicio que anotó el proxy", () => {
    expect(msDesde("1000", 1250)).toBe(250);
    expect(msDesde(null, 1250)).toBeNull();
    expect(msDesde("basura", 1250)).toBeNull();
  });

  it("lee solo las líneas de la ficha", () => {
    expect(leerLinea("[RNF-02] ficha pedido=87 ms datos=52 ms")).toEqual({ pedido: 87, datos: 52 });
    expect(leerLinea("[RNF-02] ficha pedido=? ms datos=52 ms")).toBeNull();
    expect(leerLinea("[RNF-01] estadoDelVehiculo 40 ms")).toBeNull();
  });

  it("resume con promedio, mediana y p95 por rango más cercano", () => {
    const valores = Array.from({ length: 20 }, (_, i) => (i + 1) * 10); // 10 … 200
    expect(resumir(valores)).toEqual({ n: 20, promedio: 105, mediana: 105, p95: 190, minimo: 10, maximo: 200 });
    expect(resumir([30, 10, 20])).toMatchObject({ mediana: 20, p95: 30 });
    expect(resumir([])).toBeNull();
  });

  it("entiende la duración de k6", () => {
    expect(duracionMs("5m")).toBe(300_000);
    expect(duracionMs("1m30s")).toBe(90_000);
    expect(duracionMs("45s")).toBe(45_000);
    expect(() => duracionMs("5 minutos")).toThrow();
  });
});
