# Iteración 2A — Motor de reglas: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** El motor que calcula el estado de mantenimiento de cada ítem (RF-08, RF-09, RF-12; CU-14) como función pura, con al menos 80 % de cobertura exigida en el CI (RNF-12).

**Architecture:** Un solo módulo, `src/dominio/motor.ts`, sin Prisma, Next, Supabase ni reloj del sistema: recibe el plan, las intervenciones, el kilometraje y la fecha del día, y devuelve los ítems con su estado, ya ordenados por urgencia. Las capas de datos y de presentación lo consumen en los planes 2B a 2E. Se escribe primero cada prueba.

**Tech Stack:** TypeScript estricto, Vitest 5, `@vitest/coverage-v8`.

**Spec:** `docs/superpowers/specs/2026-10-12-iteracion-2-motor-design.md`, apartados 3 (reglas), 4.1 (interfaz del motor) y 6 (pruebas y cobertura).

## Global Constraints

- `src/dominio/motor.ts` no importa Prisma, Next ni Supabase (ESLint ya lo impide en `src/dominio`) y no llama a `new Date()` sin argumentos: la fecha del día entra por `hoy`.
- Las fechas son días calendario representados como medianoche UTC, igual que las columnas `DATE` y que `fechaDeHoy()` de `src/dominio/fechas.ts`.
- Textos en español rioplatense; kilómetros con `formatearKm` (es-AR) y fechas con `formatearFecha` (dd/mm/aaaa).
- Umbral de "próximo a vencer": el 10 % del intervalo, incluido el borde (RF-08).
- Supuesto (RF-09): se compara contra el kilometraje de alta y solo cuando lo **supera**; se ubica en `floor(km_alta / intervalo) × intervalo`.
- Un ítem incierto (supuesto pendiente o a verificar) se calcula solo por km y nunca se muestra "al día": si el cálculo da al día, lo reemplaza su chip de incertidumbre.
- Cobertura mínima del 80 % en líneas, ramas, funciones y sentencias de `src/dominio/motor.ts` (RNF-12), exigida por el job `verificar`.

## Review Focus

1. **Fecha de referencia 29/02 más 12 meses:** tiene que dar 28/02 del año siguiente, no 01/03 (Task 1).
2. **Supuesto de un ítem con meses y una fecha del día muy lejana:** no puede vencer por fecha, porque el supuesto no tiene fecha (Task 2).
3. **Dos ejecuciones ciertas del mismo ítem:** cuenta la de mayor kilometraje, no la primera que llega (Task 2).
4. **Un intervalo en km de 0 por un dato corrupto:** error claro, no `NaN` en la pantalla (Task 2).
5. **Una ejecución registrada con más km que la lectura actual** (en la Iteración 3, registrar un trabajo con más km actualiza el odómetro, pero puede llegar antes): el ítem queda al día y el texto dice cuántos km faltan, sin números negativos (Task 2).

## Mapa de archivos

| Archivo | Responsabilidad |
|---|---|
| `src/dominio/motor.ts` | Tipos, `sumarMeses`, `kmSupuesto`, `calcularEstado`, `supuestosFaltantes`, `resumen`, `cambiosDeEstado` |
| `tests/unit/motor.test.ts` | Pruebas del motor |
| `vitest.config.ts` | Cobertura con umbral sobre el motor |
| `package.json` | `@vitest/coverage-v8` y el script `test:cobertura` |
| `.github/workflows/ci.yml` | El job `verificar` corre las unitarias con cobertura |

## Preparación

- [ ] Con el PR de la spec (#7) mergeado: `git checkout main && git pull && git checkout -b iteracion-2a-motor`. Primer commit: este plan (`docs: plan de implementación 2A (motor de reglas)`).

---

### Task 1: Tipos, fechas y supuesto, con la cobertura configurada

**Files:**
- Create: `src/dominio/motor.ts`, `tests/unit/motor.test.ts`
- Modify: `vitest.config.ts`, `package.json`

**Interfaces:**
- Produces: tipos `Origen`, `Estado`, `Incertidumbre`, `ItemDelPlan`, `Ejecucion`, `EntradaMotor`, `ItemConEstado`; `UMBRAL_PROXIMO`; `sumarMeses(fecha: Date, meses: number): Date`; `kmSupuesto(intervaloKm: number, kmAlta: number): number | null`.

- [ ] **Step 1: Instalar la cobertura** — `npm install -D @vitest/coverage-v8@^5.0.4` (misma línea de versión que `vitest`). En `package.json`, `scripts`: `"test:cobertura": "vitest run --project unit --coverage"`.

- [ ] **Step 2: Configurar el umbral** — en `vitest.config.ts`, dentro de `defineConfig({ test: { … } })`, al mismo nivel que `projects`:

```ts
    // RNF-12: el motor de reglas mantiene al menos 80 % de cobertura.
    coverage: {
      provider: "v8",
      include: ["src/dominio/motor.ts"],
      reporter: ["text", "html"],
      thresholds: { lines: 80, branches: 80, functions: 80, statements: 80 },
    },
```

- [ ] **Step 3: Prueba que falla** — `tests/unit/motor.test.ts`:

```ts
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
```

- [ ] **Step 4: Verificar que falla** — `npx vitest run --project unit tests/unit/motor.test.ts` → FAIL (no existe `@/dominio/motor`).

- [ ] **Step 5: Implementación** — `src/dominio/motor.ts`:

```ts
/**
 * Motor de reglas (CU-14; RF-08, RF-09, RF-12). Función pura: no lee la base ni el reloj.
 * Las fechas son días calendario como medianoche UTC, igual que las columnas DATE.
 */

/** Fracción del intervalo desde la que un ítem pasa a "próximo a vencer" (RF-08). */
export const UMBRAL_PROXIMO = 0.1;

export type Origen = "registrada" | "supuesta_pendiente" | "supuesta_confirmada" | "supuesta_a_verificar";
export type Estado = "vencido" | "proximo" | "al_dia";
export type Incertidumbre = "a_confirmar" | "verificar_en_taller";

export type ItemDelPlan = {
  itemId: number;
  nombre: string;
  tipo: "reemplazo" | "inspeccion";
  km: number;
  meses: number | null;
};

export type Ejecucion = { itemId: number; origen: Origen; km: number; fecha: Date | null };

export type EntradaMotor = {
  items: ItemDelPlan[];
  intervenciones: Ejecucion[];
  kmAlta: number;
  fechaAlta: Date;
  kmActual: number;
  hoy: Date;
};

export type ItemConEstado = {
  itemId: number;
  nombre: string;
  tipo: "reemplazo" | "inspeccion";
  estado: Estado;
  incertidumbre: Incertidumbre | null;
  kmVence: number;
  fechaVence: Date | null;
  /** Fracción del intervalo que falta en el límite más cercano; 0 o menos si venció. */
  margen: number;
  /** Texto de la fila: "Cambiar · faltan 900 km o vence el 02/05/2027". */
  detalle: string;
};

/** Suma meses de calendario; si el día no existe en el mes de destino, toma el último. */
export function sumarMeses(fecha: Date, meses: number): Date {
  const anio = fecha.getUTCFullYear();
  const mes = fecha.getUTCMonth() + meses;
  const ultimoDia = new Date(Date.UTC(anio, mes + 1, 0)).getUTCDate();
  return new Date(Date.UTC(anio, mes, Math.min(fecha.getUTCDate(), ultimoDia)));
}

/** RF-09: múltiplo del intervalo inmediatamente anterior al km de alta, si el alta lo supera. */
export function kmSupuesto(intervaloKm: number, kmAlta: number): number | null {
  return kmAlta > intervaloKm ? Math.floor(kmAlta / intervaloKm) * intervaloKm : null;
}
```

- [ ] **Step 6: Verificar** — `npx vitest run --project unit tests/unit/motor.test.ts` → 7 pasan. `npm run typecheck` y `npm run lint` limpios.

- [ ] **Step 7: Commit** — `git add src/dominio/motor.ts tests/unit/motor.test.ts vitest.config.ts package.json package-lock.json` · `git commit -m "feat: base del motor de reglas y cobertura (RF-09, RNF-12)"`

---

### Task 2: Estado de cada ítem

**Files:**
- Modify: `src/dominio/motor.ts`, `tests/unit/motor.test.ts`

**Interfaces:**
- Consumes: lo producido en la Task 1.
- Produces: `calcularEstado(entrada: EntradaMotor): ItemConEstado[]` (en esta task sin ordenar; la Task 3 agrega el orden).

- [ ] **Step 1: Pruebas que fallan** — agregar al final de `tests/unit/motor.test.ts` (y sumar `calcularEstado`, `type EntradaMotor` y `type ItemDelPlan` al import de `@/dominio/motor`):

```ts
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
```

- [ ] **Step 2: Verificar que fallan** — `npx vitest run --project unit tests/unit/motor.test.ts` → FAIL (`calcularEstado` no existe).

- [ ] **Step 3: Implementación** — agregar a `src/dominio/motor.ts` (con los imports al principio del archivo):

```ts
import { formatearFecha } from "@/dominio/fechas";
import { formatearKm } from "@/dominio/kilometraje";

const DIA_MS = 86_400_000;
const CIERTAS: Origen[] = ["registrada", "supuesta_confirmada"];

type Referencia = { km: number; fecha: Date | null; incertidumbre: Incertidumbre | null };

function dias(desde: Date, hasta: Date): number {
  return Math.round((hasta.getTime() - desde.getTime()) / DIA_MS);
}

/** Spec 3.1: ejecución cierta de mayor km, o el supuesto, o uno nuevo, o km 0 y la fecha de alta. */
function referenciaDe(item: ItemDelPlan, entrada: EntradaMotor): Referencia {
  const delItem = entrada.intervenciones.filter((e) => e.itemId === item.itemId);
  const ciertas = delItem.filter((e) => CIERTAS.includes(e.origen));
  if (ciertas.length > 0) {
    const ultima = ciertas.reduce((a, b) => (b.km > a.km ? b : a));
    return { km: ultima.km, fecha: ultima.fecha, incertidumbre: null };
  }
  const supuesto = delItem[0];
  if (supuesto) {
    const incertidumbre = supuesto.origen === "supuesta_a_verificar" ? "verificar_en_taller" : "a_confirmar";
    return { km: supuesto.km, fecha: null, incertidumbre };
  }
  const km = kmSupuesto(item.km, entrada.kmAlta);
  if (km !== null) return { km, fecha: null, incertidumbre: "a_confirmar" };
  return { km: 0, fecha: entrada.fechaAlta, incertidumbre: null };
}

function detalleDe(
  item: ItemDelPlan,
  ref: Referencia,
  estado: Estado,
  kmVence: number,
  fechaVence: Date | null,
  margenKm: number,
  kmActual: number,
): string {
  const accion = item.tipo === "reemplazo" ? "Cambiar" : "Revisar";
  let dato: string;
  if (estado === "al_dia" && ref.incertidumbre) {
    dato = `supuesto a los ${formatearKm(ref.km)} km`;
  } else if (estado === "vencido") {
    dato = margenKm <= 0 ? `venció a los ${formatearKm(kmVence)} km` : `venció el ${formatearFecha(fechaVence!)}`;
  } else {
    const fecha = fechaVence ? ` o vence el ${formatearFecha(fechaVence)}` : "";
    dato = `faltan ${formatearKm(kmVence - kmActual)} km${fecha}`;
  }
  return `${accion} · ${dato}`;
}

function evaluar(item: ItemDelPlan, entrada: EntradaMotor): ItemConEstado {
  if (!(item.km > 0)) throw new Error(`El ítem ${item.itemId} tiene un intervalo en km no válido.`);
  const ref = referenciaDe(item, entrada);
  const kmVence = ref.km + item.km;
  const fechaVence = item.meses !== null && ref.fecha !== null ? sumarMeses(ref.fecha, item.meses) : null;
  const margenKm = (kmVence - entrada.kmActual) / item.km;
  const margenFecha =
    fechaVence && ref.fecha ? dias(entrada.hoy, fechaVence) / dias(ref.fecha, fechaVence) : Number.POSITIVE_INFINITY;
  const margen = Math.min(margenKm, margenFecha);
  const estado: Estado = margen <= 0 ? "vencido" : margen <= UMBRAL_PROXIMO ? "proximo" : "al_dia";
  return {
    itemId: item.itemId,
    nombre: item.nombre,
    tipo: item.tipo,
    estado,
    incertidumbre: ref.incertidumbre,
    kmVence,
    fechaVence,
    margen,
    detalle: detalleDe(item, ref, estado, kmVence, fechaVence, margenKm, entrada.kmActual),
  };
}

/** CU-14: estado de cada ítem del plan. */
export function calcularEstado(entrada: EntradaMotor): ItemConEstado[] {
  return entrada.items.map((item) => evaluar(item, entrada));
}
```

- [ ] **Step 4: Verificar** — `npx vitest run --project unit tests/unit/motor.test.ts` → 26 pasan. Si "próximo por fecha" falla, revisar `dias()`: del 26/11/2026 al 01/01/2027 hay 36 días y del 01/01/2026 al 01/01/2027, 365.

- [ ] **Step 5: Commit** — `git add src/dominio/motor.ts tests/unit/motor.test.ts` · `git commit -m "feat: estado de cada ítem del plan (RF-08, RF-09, CU-14)"`

---

### Task 3: Orden por urgencia

**Files:**
- Modify: `src/dominio/motor.ts`, `tests/unit/motor.test.ts`

**Interfaces:**
- Produces: `calcularEstado` devuelve los ítems ordenados por urgencia (RF-12, spec 3.4).

- [ ] **Step 1: Pruebas que fallan** — agregar a `tests/unit/motor.test.ts`:

```ts
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
```

- [ ] **Step 2: Verificar que fallan** — `npx vitest run --project unit tests/unit/motor.test.ts` → FAIL en "vencidos, próximos…" (sale en el orden de entrada).

- [ ] **Step 3: Implementación** — en `src/dominio/motor.ts`, reemplazar `calcularEstado` por:

```ts
/** Spec 3.4: vencidos, próximos, verificar en taller, a confirmar y al día. */
function rango(item: ItemConEstado): number {
  if (item.estado === "vencido") return 0;
  if (item.estado === "proximo") return 1;
  if (item.incertidumbre === "verificar_en_taller") return 2;
  if (item.incertidumbre === "a_confirmar") return 3;
  return 4;
}

function porUrgencia(a: ItemConEstado, b: ItemConEstado): number {
  return rango(a) - rango(b) || a.margen - b.margen || a.nombre.localeCompare(b.nombre, "es");
}

/** CU-14: estado de cada ítem del plan, ordenado por urgencia (RF-12). */
export function calcularEstado(entrada: EntradaMotor): ItemConEstado[] {
  return entrada.items.map((item) => evaluar(item, entrada)).sort(porUrgencia);
}
```

- [ ] **Step 4: Verificar** — `npx vitest run --project unit tests/unit/motor.test.ts` → 29 pasan.

- [ ] **Step 5: Commit** — `git add src/dominio/motor.ts tests/unit/motor.test.ts` · `git commit -m "feat: orden de los ítems por urgencia (RF-12)"`

---

### Task 4: Supuestos faltantes, resumen, cambios de estado y cobertura en el CI

**Files:**
- Modify: `src/dominio/motor.ts`, `tests/unit/motor.test.ts`, `.github/workflows/ci.yml`

**Interfaces:**
- Produces:
  - `supuestosFaltantes(entrada: Pick<EntradaMotor, "items" | "intervenciones" | "kmAlta">): { itemId: number; km: number }[]` (lo usa `estadoDelVehiculo` en el plan 2B para insertar los supuestos).
  - `resumen(items: ItemConEstado[]): { vencidos: number; proximos: number; inciertos: number }` (chips de la lista, plan 2C).
  - `type Cambio = { itemId: number; nombre: string; estado: Estado }` y `cambiosDeEstado(antes: ItemConEstado[], despues: ItemConEstado[]): Cambio[]` (aviso de CU-08, plan 2E).

- [ ] **Step 1: Pruebas que fallan** — sumar `supuestosFaltantes`, `resumen` y `cambiosDeEstado` al import y agregar:

```ts
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
```

- [ ] **Step 2: Verificar que fallan** — `npx vitest run --project unit tests/unit/motor.test.ts` → FAIL (las tres funciones no existen).

- [ ] **Step 3: Implementación** — agregar a `src/dominio/motor.ts`:

```ts
/** Spec 4.2: supuestos que el cálculo tiene que guardar (ítems sin ninguna ejecución). */
export function supuestosFaltantes(
  entrada: Pick<EntradaMotor, "items" | "intervenciones" | "kmAlta">,
): { itemId: number; km: number }[] {
  return entrada.items.flatMap((item) => {
    if (entrada.intervenciones.some((e) => e.itemId === item.itemId)) return [];
    const km = kmSupuesto(item.km, entrada.kmAlta);
    return km === null ? [] : [{ itemId: item.itemId, km }];
  });
}

/** Chips de la lista de vehículos (mockup 04). */
export function resumen(items: ItemConEstado[]): { vencidos: number; proximos: number; inciertos: number } {
  return {
    vencidos: items.filter((i) => i.estado === "vencido").length,
    proximos: items.filter((i) => i.estado === "proximo").length,
    inciertos: items.filter((i) => i.incertidumbre !== null).length,
  };
}

export type Cambio = { itemId: number; nombre: string; estado: Estado };

/** CU-08 paso 7: ítems cuyo estado cambió entre dos cálculos, en el orden del segundo. */
export function cambiosDeEstado(antes: ItemConEstado[], despues: ItemConEstado[]): Cambio[] {
  const previo = new Map(antes.map((i) => [i.itemId, i.estado]));
  return despues
    .filter((i) => previo.get(i.itemId) !== i.estado)
    .map(({ itemId, nombre, estado }) => ({ itemId, nombre, estado }));
}
```

- [ ] **Step 4: Verificar con cobertura** — `npm run test:cobertura`. Esperado: todas las unitarias pasan (las 49 anteriores + 34 del motor) y la tabla de cobertura de `motor.ts` queda en 80 % o más en las cuatro columnas. Si alguna columna queda debajo, la tabla indica las líneas sin cubrir: agregar la prueba que las ejerza (no bajar el umbral).

- [ ] **Step 5: CI** — en `.github/workflows/ci.yml`, job `verificar`, reemplazar `- run: npm test` por:

```yaml
      # Unitarias con el umbral de cobertura del motor (RNF-12)
      - run: npm run test:cobertura
```

- [ ] **Step 6: Verificar el resto** — `npm run typecheck`, `npm run lint` limpios.

- [ ] **Step 7: Commit** — `git add src/dominio/motor.ts tests/unit/motor.test.ts .github/workflows/ci.yml` · `git commit -m "feat: supuestos faltantes, resumen y cambios de estado; cobertura en el CI (RNF-12)"`

- [ ] **Step 8: PR** — escaneo de secretos sobre `git diff origin/main..HEAD`; con la confirmación de Felipe, push y `gh pr create --title "Iteración 2A: motor de reglas"`. Merge con los tres checks en verde.
