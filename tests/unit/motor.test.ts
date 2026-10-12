import { describe, expect, it } from "vitest";
import {
  calcularEstado,
  cambiosDeEstado,
  kmSupuesto,
  resumen,
  sumarMeses,
  supuestosFaltantes,
  type EntradaMotor,
  type ItemDelPlan,
} from "@/dominio/motor";

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

const aceite: ItemDelPlan = { itemId: 1, nombre: "Aceite y filtro de aceite", tipo: "reemplazo", km: 15_000, meses: 12 };
const pastillas: ItemDelPlan = { itemId: 4, nombre: "Pastillas de freno delanteras", tipo: "inspeccion", km: 15_000, meses: 12 };
const filtroAire: ItemDelPlan = { itemId: 5, nombre: "Filtro de aire", tipo: "reemplazo", km: 30_000, meses: null };

function entrada(cambios: Partial<EntradaMotor> = {}): EntradaMotor {
  return {
    items: [aceite],
    intervenciones: [],
    kmAlta: 5_000,
    fechaAlta: d("2026-01-01"),
    kmActual: 5_000,
    hoy: d("2026-01-01"),
    ...cambios,
  };
}
const unico = (e: EntradaMotor) => calcularEstado(e)[0]!;

describe("calcularEstado: referencia y vencimiento (RF-08, CU-14)", () => {
  it("sin ejecuciones y sin superar el intervalo, parte de km 0 y la fecha de alta", () => {
    const r = unico(entrada({ kmActual: 10_000, hoy: d("2026-06-01") }));
    expect(r).toMatchObject({ estado: "al_dia", incertidumbre: null, kmVence: 15_000, fechaVence: d("2027-01-01") });
    expect(r.detalle).toBe("Cambiar · faltan 5.000 km o vence el 01/01/2027");
  });

  it("próximo cuando falta exactamente el 10 % del intervalo en km", () => {
    expect(unico(entrada({ kmActual: 13_500 })).estado).toBe("proximo");
  });

  it("al día cuando falta apenas más del 10 %", () => {
    expect(unico(entrada({ kmActual: 13_499 })).estado).toBe("al_dia");
  });

  it("vencido al alcanzar el km", () => {
    const r = unico(entrada({ kmActual: 15_000 }));
    expect(r.estado).toBe("vencido");
    expect(r.detalle).toBe("Cambiar · venció a los 15.000 km");
  });

  it("vencido por fecha aunque falten km", () => {
    const r = unico(entrada({ kmActual: 6_000, hoy: d("2027-01-01") }));
    expect(r.estado).toBe("vencido");
    expect(r.detalle).toBe("Cambiar · venció el 01/01/2027");
  });

  it("vencido por los dos límites: cita el km", () => {
    expect(unico(entrada({ kmActual: 16_000, hoy: d("2027-02-01") })).detalle).toBe(
      "Cambiar · venció a los 15.000 km",
    );
  });

  it("próximo por fecha con 36 de 365 días restantes, al día con 37", () => {
    expect(unico(entrada({ hoy: d("2026-11-26") })).estado).toBe("proximo");
    expect(unico(entrada({ hoy: d("2026-11-25") })).estado).toBe("al_dia");
  });

  it("parte de la última ejecución registrada, con su km y su fecha", () => {
    const r = unico(
      entrada({
        intervenciones: [{ itemId: 1, origen: "registrada", km: 20_000, fecha: d("2026-03-10") }],
        kmActual: 30_000,
        hoy: d("2026-06-01"),
      }),
    );
    expect(r).toMatchObject({ estado: "al_dia", kmVence: 35_000, fechaVence: d("2027-03-10") });
    expect(r.detalle).toBe("Cambiar · faltan 5.000 km o vence el 10/03/2027");
  });

  it("con dos ejecuciones ciertas, usa la de mayor km aunque llegue primero la otra", () => {
    const r = unico(
      entrada({
        intervenciones: [
          { itemId: 1, origen: "registrada", km: 35_000, fecha: d("2026-09-01") },
          { itemId: 1, origen: "registrada", km: 20_000, fecha: d("2026-03-10") },
        ],
        kmActual: 36_000,
        hoy: d("2026-10-01"),
      }),
    );
    expect(r.kmVence).toBe(50_000);
  });

  it("un supuesto confirmado es una referencia cierta, con fecha", () => {
    const r = unico(
      entrada({
        kmAlta: 62_400,
        intervenciones: [{ itemId: 1, origen: "supuesta_confirmada", km: 60_000, fecha: d("2026-03-10") }],
        kmActual: 62_400,
        hoy: d("2026-10-12"),
      }),
    );
    expect(r).toMatchObject({ incertidumbre: null, kmVence: 75_000, fechaVence: d("2027-03-10") });
  });

  it("un ítem sin meses vence solo por km", () => {
    const r = unico(entrada({ items: [filtroAire], kmActual: 10_000, hoy: d("2030-01-01") }));
    expect(r).toMatchObject({ estado: "al_dia", fechaVence: null });
    expect(r.detalle).toBe("Cambiar · faltan 20.000 km");
  });

  it("los ítems de inspección dicen Revisar", () => {
    expect(unico(entrada({ items: [pastillas], kmActual: 10_000 })).detalle).toMatch(/^Revisar · /);
  });

  it("una ejecución con más km que la lectura actual deja el ítem al día, sin negativos", () => {
    const r = unico(
      entrada({
        intervenciones: [{ itemId: 1, origen: "registrada", km: 70_000, fecha: d("2026-10-01") }],
        kmActual: 62_400,
        hoy: d("2026-10-12"),
      }),
    );
    expect(r.estado).toBe("al_dia");
    expect(r.detalle).toBe("Cambiar · faltan 22.600 km o vence el 01/10/2027");
  });

  it("un intervalo en km no válido es un error claro", () => {
    expect(() => unico(entrada({ items: [{ ...aceite, km: 0 }] }))).toThrow(/intervalo/);
  });
});

describe("calcularEstado: supuestos (RF-09)", () => {
  const usado = { kmAlta: 62_400, kmActual: 62_400, hoy: d("2026-10-12") };

  it("sin ejecuciones y superando el intervalo, supone el múltiplo anterior y lo marca a confirmar", () => {
    const r = unico(entrada(usado));
    expect(r).toMatchObject({ estado: "al_dia", incertidumbre: "a_confirmar", kmVence: 75_000, fechaVence: null });
    expect(r.detalle).toBe("Cambiar · supuesto a los 60.000 km");
  });

  it("un supuesto pendiente ya guardado da el mismo resultado", () => {
    const r = unico(
      entrada({ ...usado, intervenciones: [{ itemId: 1, origen: "supuesta_pendiente", km: 60_000, fecha: null }] }),
    );
    expect(r).toMatchObject({ incertidumbre: "a_confirmar", kmVence: 75_000 });
  });

  it('"No lo sé" lo marca para verificar en el taller', () => {
    const r = unico(
      entrada({ ...usado, intervenciones: [{ itemId: 1, origen: "supuesta_a_verificar", km: 60_000, fecha: null }] }),
    );
    expect(r.incertidumbre).toBe("verificar_en_taller");
  });

  it("un supuesto no vence por fecha, aunque el ítem tenga meses", () => {
    expect(unico(entrada({ ...usado, hoy: d("2035-01-01") })).estado).toBe("al_dia");
  });

  it("un supuesto vencido muestra el vencimiento y conserva la marca", () => {
    const r = unico(entrada({ ...usado, kmActual: 75_300 }));
    expect(r).toMatchObject({ estado: "vencido", incertidumbre: "a_confirmar" });
    expect(r.detalle).toBe("Cambiar · venció a los 75.000 km");
  });
});

const liquidoFrenos: ItemDelPlan = { itemId: 2, nombre: "Líquido de frenos", tipo: "reemplazo", km: 45_000, meses: 24 };
const correa: ItemDelPlan = { itemId: 3, nombre: "Correa auxiliar", tipo: "reemplazo", km: 90_000, meses: 60 };

/** Un ítem en cada situación: vencido, próximo, verificar, a confirmar y al día. */
function mezcla(): EntradaMotor {
  return entrada({
    items: [correa, pastillas, aceite, filtroAire, liquidoFrenos],
    intervenciones: [
      { itemId: 1, origen: "registrada", km: 35_000, fecha: d("2026-09-01") }, // aceite: vence a los 50.000
      { itemId: 2, origen: "registrada", km: 9_000, fecha: d("2026-09-01") }, // frenos: faltan 4.000 de 45.000
      { itemId: 4, origen: "supuesta_pendiente", km: 45_000, fecha: null }, // pastillas: a confirmar
      { itemId: 5, origen: "supuesta_a_verificar", km: 30_000, fecha: null }, // filtro: verificar en taller
    ],
    kmAlta: 1_000,
    kmActual: 50_000,
    hoy: d("2026-10-12"),
  });
}

describe("calcularEstado: orden por urgencia (RF-12)", () => {
  it("vencidos, próximos, verificar en taller, a confirmar y al día", () => {
    expect(calcularEstado(mezcla()).map((i) => i.nombre)).toEqual([
      "Aceite y filtro de aceite",
      "Líquido de frenos",
      "Filtro de aire",
      "Pastillas de freno delanteras",
      "Correa auxiliar",
    ]);
  });

  it("dentro de un grupo, primero el de menos margen", () => {
    const r = calcularEstado(
      entrada({
        items: [liquidoFrenos, aceite],
        intervenciones: [
          { itemId: 1, origen: "registrada", km: 35_000, fecha: d("2026-09-01") }, // vence a los 50.000
          { itemId: 2, origen: "registrada", km: 6_000, fecha: d("2026-09-01") }, // vence a los 51.000
        ],
        kmActual: 52_000,
        hoy: d("2026-10-12"),
      }),
    );
    expect(r.map((i) => i.estado)).toEqual(["vencido", "vencido"]);
    expect(r.map((i) => i.nombre)).toEqual(["Aceite y filtro de aceite", "Líquido de frenos"]);
  });

  it("con el mismo margen, ordena por nombre", () => {
    const r = calcularEstado(entrada({ items: [pastillas, aceite], kmActual: 10_000 }));
    expect(r.map((i) => i.nombre)).toEqual(["Aceite y filtro de aceite", "Pastillas de freno delanteras"]);
  });
});

describe("supuestosFaltantes", () => {
  it("devuelve los supuestos de los ítems sin ninguna ejecución cuyo intervalo supera el alta", () => {
    expect(
      supuestosFaltantes({
        items: [aceite, liquidoFrenos, correa],
        intervenciones: [{ itemId: 2, origen: "registrada", km: 40_000, fecha: d("2025-05-01") }],
        kmAlta: 62_400,
      }),
    ).toEqual([{ itemId: 1, km: 60_000 }]);
  });

  it("no repite un supuesto ya guardado", () => {
    expect(
      supuestosFaltantes({
        items: [aceite],
        intervenciones: [{ itemId: 1, origen: "supuesta_pendiente", km: 60_000, fecha: null }],
        kmAlta: 62_400,
      }),
    ).toEqual([]);
  });
});

describe("resumen", () => {
  it("cuenta vencidos, próximos e inciertos (un supuesto vencido suma en los dos)", () => {
    expect(resumen(calcularEstado(mezcla()))).toEqual({ vencidos: 1, proximos: 1, inciertos: 2 });
    const supuestoVencido = calcularEstado(entrada({ kmAlta: 62_400, kmActual: 75_300, hoy: d("2026-10-12") }));
    expect(resumen(supuestoVencido)).toEqual({ vencidos: 1, proximos: 0, inciertos: 1 });
  });
});

describe("cambiosDeEstado (CU-08 paso 7)", () => {
  it("devuelve solo los ítems cuyo estado cambió, con el estado nuevo", () => {
    const base = { items: [aceite, correa], kmAlta: 62_400, hoy: d("2026-10-12") };
    const antes = calcularEstado(entrada({ ...base, kmActual: 74_800 }));
    const despues = calcularEstado(entrada({ ...base, kmActual: 75_300 }));
    expect(cambiosDeEstado(antes, despues)).toEqual([
      { itemId: 1, nombre: "Aceite y filtro de aceite", estado: "vencido" },
    ]);
  });

  it("sin cambios, la lista queda vacía", () => {
    const e = calcularEstado(mezcla());
    expect(cambiosDeEstado(e, e)).toEqual([]);
  });
});
