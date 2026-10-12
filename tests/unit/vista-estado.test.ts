import { describe, expect, it } from "vitest";
import { chipsDeItem, chipsDeResumen, textoInciertos } from "@/dominio/vista-estado";

describe("chipsDeItem (spec 3.3)", () => {
  it("un ítem cierto muestra solo su estado", () => {
    expect(chipsDeItem({ estado: "proximo", incertidumbre: null })).toEqual([{ tipo: "proximo", texto: "Próximo" }]);
  });
  it("un incierto que daría al día muestra solo la marca", () => {
    expect(chipsDeItem({ estado: "al_dia", incertidumbre: "a_confirmar" })).toEqual([
      { tipo: "a_confirmar", texto: "A confirmar" },
    ]);
    expect(chipsDeItem({ estado: "al_dia", incertidumbre: "verificar_en_taller" })).toEqual([
      { tipo: "verificar_en_taller", texto: "Verificar en taller" },
    ]);
  });
  it("un incierto vencido muestra el estado y la marca al lado", () => {
    expect(chipsDeItem({ estado: "vencido", incertidumbre: "a_confirmar" })).toEqual([
      { tipo: "vencido", texto: "Vencido" },
      { tipo: "a_confirmar", texto: "A confirmar" },
    ]);
  });
});

describe("chipsDeResumen (mockup 04)", () => {
  it("cuenta con singular y plural", () => {
    expect(chipsDeResumen({ vencidos: 1, proximos: 2, aConfirmar: 1, aVerificar: 0 })).toEqual([
      { tipo: "vencido", texto: "1 vencido" },
      { tipo: "proximo", texto: "2 próximos" },
      { tipo: "a_confirmar", texto: "1 a confirmar" },
    ]);
    expect(chipsDeResumen({ vencidos: 3, proximos: 1, aConfirmar: 0, aVerificar: 0 })).toEqual([
      { tipo: "vencido", texto: "3 vencidos" },
      { tipo: "proximo", texto: "1 próximo" },
    ]);
  });
  it("los que el dueño no supo responder cuentan aparte, como en la ficha", () => {
    expect(chipsDeResumen({ vencidos: 0, proximos: 0, aConfirmar: 0, aVerificar: 2 })).toEqual([
      { tipo: "verificar_en_taller", texto: "2 a verificar" },
    ]);
    expect(chipsDeResumen({ vencidos: 0, proximos: 0, aConfirmar: 3, aVerificar: 1 })).toEqual([
      { tipo: "a_confirmar", texto: "3 a confirmar" },
      { tipo: "verificar_en_taller", texto: "1 a verificar" },
    ]);
  });
  it("sin nada pendiente dice Todo al día", () => {
    expect(chipsDeResumen({ vencidos: 0, proximos: 0, aConfirmar: 0, aVerificar: 0 })).toEqual([{ tipo: "al_dia", texto: "Todo al día" }]);
  });
});

describe("textoInciertos (mockup 06)", () => {
  it("explica los supuestos con singular y plural", () => {
    expect(textoInciertos([{ incertidumbre: "a_confirmar" }, { incertidumbre: null }])).toBe(
      "1 ítem a confirmar. Lo supusimos porque el auto se cargó con más kilómetros que el intervalo.",
    );
    expect(textoInciertos(Array.from({ length: 6 }, () => ({ incertidumbre: "a_confirmar" as const })))).toMatch(
      /^6 ítems a confirmar\./,
    );
  });
  it("sin supuestos pendientes no hay texto (los de verificar en taller ya tienen respuesta)", () => {
    expect(textoInciertos([{ incertidumbre: "verificar_en_taller" }, { incertidumbre: null }])).toBeNull();
  });
});
