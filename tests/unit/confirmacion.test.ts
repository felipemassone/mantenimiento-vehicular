import { describe, expect, it } from "vitest";
import { destinoDelAlta, filaAbierta, terminoLaConfirmacion } from "@/dominio/confirmacion";

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
