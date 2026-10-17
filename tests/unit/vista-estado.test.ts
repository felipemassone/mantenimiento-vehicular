import { describe, expect, it } from "vitest";
import {
  chipsDeItem,
  chipsDeResumen,
  destinoDeItem,
  textoCambios,
  textoCambiosTrabajo,
  textoInciertos,
  ultimosTrabajosPorItem,
} from "@/dominio/vista-estado";

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

describe("textoCambios (CU-08 paso 7, mockup 14)", () => {
  it("un cambio, en singular", () => {
    expect(textoCambios(75300, [{ nombre: "Aceite y filtro de aceite", estado: "vencido" }])).toBe(
      "Con 75.300 km cambió el estado de 1 ítem: Aceite y filtro de aceite, ahora vencido.",
    );
  });
  it("varios, en plural y en el orden recibido", () => {
    expect(
      textoCambios(82000, [
        { nombre: "Correa auxiliar", estado: "proximo" },
        { nombre: "Líquido de enfriamiento", estado: "al_dia" },
      ]),
    ).toBe(
      "Con 82.000 km cambió el estado de 2 ítems: Correa auxiliar, ahora próximo; Líquido de enfriamiento, ahora al día.",
    );
  });
  it("sin cambios no hay aviso", () => {
    expect(textoCambios(82000, [])).toBeNull();
  });
});

describe("textoCambiosTrabajo (CU-10 paso 7)", () => {
  it("nombra lo que cambió con el trabajo", () => {
    expect(textoCambiosTrabajo([{ nombre: "Aceite y filtro de aceite", estado: "al_dia" }])).toBe(
      "Con el trabajo registrado cambió el estado de 1 ítem: Aceite y filtro de aceite, ahora al día.",
    );
  });
  it("sin cambios, nada", () => {
    expect(textoCambiosTrabajo([])).toBeNull();
  });
});

describe("destinoDeItem (la fila lleva a lo que pide su estado)", () => {
  const v = "v1";
  it("con duda lleva a confirmar, con registrar como enlace secundario", () => {
    expect(destinoDeItem(v, { itemId: 3, estado: "vencido", incertidumbre: "a_confirmar" }, null)).toEqual({
      href: "/vehiculos/v1/confirmar?item=3",
      secundario: { href: "/vehiculos/v1/registrar?item=3", texto: "Registrar trabajo" },
    });
    expect(destinoDeItem(v, { itemId: 3, estado: "al_dia", incertidumbre: "verificar_en_taller" }, null).href).toBe(
      "/vehiculos/v1/confirmar?item=3",
    );
  });
  it("vencido o próximo lleva a registrar, aunque tenga un trabajo anterior", () => {
    expect(destinoDeItem(v, { itemId: 3, estado: "vencido", incertidumbre: null }, "t1")).toEqual({
      href: "/vehiculos/v1/registrar?item=3",
      secundario: null,
    });
    expect(destinoDeItem(v, { itemId: 3, estado: "proximo", incertidumbre: null }, "t1").href).toBe(
      "/vehiculos/v1/registrar?item=3",
    );
  });
  it("al día lleva al último trabajo del ítem, o a registrar si no tiene", () => {
    expect(destinoDeItem(v, { itemId: 3, estado: "al_dia", incertidumbre: null }, "t1").href).toBe(
      "/vehiculos/v1/historial/t1?desde=ficha",
    );
    expect(destinoDeItem(v, { itemId: 3, estado: "al_dia", incertidumbre: null }, null).href).toBe(
      "/vehiculos/v1/registrar?item=3",
    );
  });
});

describe("ultimosTrabajosPorItem (spec 3.1)", () => {
  const d = (s: string) => new Date(`${s}T00:00:00Z`);
  it("elige el de mayor km y, si empatan, el más reciente; ignora los trabajos libres", () => {
    const m = ultimosTrabajosPorItem([
      { id: "a", itemId: 1, km: 30000, fecha: d("2026-05-01") },
      { id: "b", itemId: 1, km: 45000, fecha: d("2026-01-01") },
      { id: "c", itemId: 2, km: 10000, fecha: d("2026-01-01") },
      { id: "d", itemId: 2, km: 10000, fecha: d("2026-02-01") },
      { id: "e", itemId: null, km: 99000, fecha: d("2026-09-01") },
    ]);
    expect([...m]).toEqual([
      [1, "b"],
      [2, "d"],
    ]);
  });
});
