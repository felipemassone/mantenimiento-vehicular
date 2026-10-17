import { describe, expect, it } from "vitest";
import {
  aclaracionDelSupuesto,
  destinoDelAlta,
  destinoTrasResponder,
  filaAbierta,
  preguntaDelSupuesto,
  terminoLaConfirmacion,
  textoNoLoSe,
  vistaPrevia,
} from "@/dominio/confirmacion";

const p = (itemId: number) => ({ itemId, origen: "supuesta_pendiente" as const });
const v = (itemId: number) => ({ itemId, origen: "supuesta_a_verificar" as const });

describe("filaAbierta (mockup 13)", () => {
  it("abre la fila pedida por el enlace Confirmar dato, aunque sea un No lo sé", () => {
    expect(filaAbierta([p(1), v(2), p(3)], "2")).toBe(2);
  });
  it("si no se pidió ninguna, abre el primer supuesto sin responder", () => {
    expect(filaAbierta([v(2), p(3), p(1)], undefined)).toBe(3);
  });
  it("una fila pedida que no está (ajena, ya respondida o basura) se ignora", () => {
    expect(filaAbierta([p(1)], "99")).toBe(1);
    expect(filaAbierta([p(1)], "abc")).toBe(1);
    expect(filaAbierta([p(1)], "1.5")).toBe(1);
  });
  it("si todos son No lo sé, abre el primero; sin supuestos, ninguna", () => {
    expect(filaAbierta([v(4), v(2)], undefined)).toBe(4);
    expect(filaAbierta([], undefined)).toBeNull();
  });
});

describe("terminoLaConfirmacion (spec 5)", () => {
  it("termina cuando no queda ninguno sin responder; No lo sé cuenta como respuesta", () => {
    expect(terminoLaConfirmacion([])).toBe(true);
    expect(terminoLaConfirmacion([v(1), v(2)])).toBe(true);
    expect(terminoLaConfirmacion([v(1), p(2)])).toBe(false);
  });
});

describe("destinoDelAlta (CU-05)", () => {
  it("con supuestos va a confirmarlos; sin supuestos, a la ficha", () => {
    expect(destinoDelAlta("abc", true)).toBe("/vehiculos/abc/confirmar?desde=alta");
    expect(destinoDelAlta("abc", false)).toBe("/vehiculos/abc");
  });
});

describe("destinoTrasResponder (spec 5)", () => {
  it("si terminó, vuelve a la ficha", () => {
    expect(destinoTrasResponder("abc", true, true)).toBe("/vehiculos/abc");
    expect(destinoTrasResponder("abc", false, true)).toBe("/vehiculos/abc");
  });
  it("si no terminó, sigue en la pantalla sin la fila pedida, que ya se respondió", () => {
    expect(destinoTrasResponder("abc", true, false)).toBe("/vehiculos/abc/confirmar?desde=alta");
    expect(destinoTrasResponder("abc", false, false)).toBe("/vehiculos/abc/confirmar");
  });
});

describe("destinos del primer auto (spec 2026-10-16, apartado 3)", () => {
  it("el primer auto sin supuestos va directo a la ficha con la bienvenida", () => {
    expect(destinoDelAlta("abc", false, true)).toBe("/vehiculos/abc?bienvenida=1");
    expect(destinoDelAlta("abc", true, true)).toBe("/vehiculos/abc/confirmar?desde=alta");
  });
  it("al terminar de confirmar el primer auto desde el alta, la ficha muestra la bienvenida", () => {
    expect(destinoTrasResponder("abc", true, true, true)).toBe("/vehiculos/abc?bienvenida=1");
    expect(destinoTrasResponder("abc", false, true, true)).toBe("/vehiculos/abc");
    expect(destinoTrasResponder("abc", true, false, true)).toBe("/vehiculos/abc/confirmar?desde=alta");
  });
});

describe("textos de Confirmar datos (spec 2026-10-16, apartado 2)", () => {
  it("la pregunta lleva el km supuesto y el verbo del tipo", () => {
    expect(preguntaDelSupuesto("reemplazo", "60.000")).toBe("¿Hiciste el cambio cerca de los 60.000 km?");
    expect(preguntaDelSupuesto("inspeccion", "45.000")).toBe("¿Hiciste la revisión cerca de los 45.000 km?");
  });
  it("en una inspección aclara que revisar sin cambiar también cuenta", () => {
    expect(aclaracionDelSupuesto("inspeccion")).toBe("Si lo revisaron y estaba bien, también cuenta.");
    expect(aclaracionDelSupuesto("reemplazo")).toBeNull();
  });
  it("explica qué pasa con No lo sé", () => {
    expect(textoNoLoSe("60.000")).toBe(
      "Si no lo sabés, seguimos contando desde los 60.000 km y te lo marcamos para verificar en el taller.",
    );
  });
});

describe("vistaPrevia (calculada con el motor)", () => {
  const d = (s: string) => new Date(`${s}T00:00:00Z`);
  const aceite = { itemId: 1, nombre: "Aceite", tipo: "reemplazo" as const, km: 15000, meses: 12 };
  const hoy = d("2026-10-16");
  it("con una fecha reciente queda al día y dice cuánto falta", () => {
    expect(vistaPrevia({ item: aceite, km: 75000, fecha: d("2026-09-01"), kmActual: 80000, hoy })).toEqual({
      estado: "al_dia",
      texto: "Con ese dato: faltan 10.000 km o vence el 01/09/2027.",
    });
  });
  it("cerca del límite queda próximo", () => {
    expect(vistaPrevia({ item: aceite, km: 66000, fecha: d("2026-09-01"), kmActual: 80000, hoy })).toEqual({
      estado: "proximo",
      texto: "Con ese dato: faltan 1.000 km o vence el 01/09/2027.",
    });
  });
  it("con una fecha vieja queda vencido", () => {
    expect(vistaPrevia({ item: aceite, km: 75000, fecha: d("2025-01-10"), kmActual: 80000, hoy })).toEqual({
      estado: "vencido",
      texto: "Con ese dato: venció el 10/01/2026.",
    });
  });
});
