# Iteración 2C — Ficha y lista con el estado: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el propietario vea el estado de mantenimiento: la sección "Mantenimiento" de la ficha con el semáforo ordenado por urgencia (CU-09, RF-12; mockups 06 y 12) y los chips de resumen en "Mis vehículos" (mockup 04).

**Architecture:** Las reglas de qué chips mostrar son puras, en `src/dominio/vista-estado.ts`, con pruebas unitarias. El chip es un componente de presentación (`src/components/chip-estado.tsx`). Las páginas leen `estadoDelVehiculo` y `resumenesDeMisVehiculos` (plan 2B). La sección "Plan del fabricante" de la Iteración 1 desaparece, y con ella el plan que traía `obtenerVehiculo`.

**Tech Stack:** Next.js 16 (Server Components), Tailwind 4, lucide-react, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-12-iteracion-2-motor-design.md`, apartados 3.3 a 3.5 y 5 · `DESIGN.md` (colores de estado, chip, fila de ítem, borde punteado del dato incierto) · Mockups `docs/diseno/pantallas/mobile/04` y `06`, `web/12`.

## Global Constraints

- El estado nunca se comunica solo con color: siempre ícono y palabra (DESIGN.md). Íconos: Vencido → octógono de alerta (`OctagonAlert`), Próximo → triángulo (`TriangleAlert`), Al día → círculo con tilde (`CircleCheck`), A confirmar y Verificar en taller → círculo con signo de pregunta (`CircleHelp`).
- Colores: solo los tokens `estado-*` de `globals.css`. Un ítem incierto lleva borde punteado `estado-confirmar-borde`.
- Un incierto que daría al día muestra solo su chip de incertidumbre; uno vencido o próximo muestra su estado y la marca al lado (spec 3.3).
- Sin el botón "Registrar trabajo" (CU-10, Iteración 3) y sin el enlace "Confirmar dato" (llega con la pantalla del plan 2D).
- Escritorio: el mismo contenido en la columna de 720 px (mockup 12).

## Review Focus

1. **Un modelo fuera del catálogo:** la ficha conserva el aviso y la lista no muestra chips (Task 2 y 3).
2. **Un vehículo con todo al día y sin supuestos:** la lista dice "Todo al día" (Task 1).
3. **Un supuesto vencido:** la fila muestra "Vencido" y "A confirmar", con el borde punteado (Task 1 y 2).
4. **Nombres de ítems largos en un celular de 360 px:** los chips no se cortan ni desbordan la página (Task 3, verificación visual).
5. **Plural y singular en los contadores:** "1 vencido" / "2 vencidos", "1 ítem a confirmar" / "6 ítems a confirmar" (Task 1).

## Mapa de archivos

| Archivo | Responsabilidad |
|---|---|
| `src/dominio/vista-estado.ts` | `chipsDeItem`, `chipsDeResumen`, `textoInciertos` |
| `src/components/chip-estado.tsx` | Chip con ícono y palabra |
| `src/app/(propietario)/vehiculos/[id]/page.tsx` | Sección "Mantenimiento" |
| `src/app/(propietario)/vehiculos/page.tsx` | Chips de resumen en cada tarjeta |
| `src/datos/vehiculos.ts` | `obtenerVehiculo` deja de traer el plan |
| `src/dominio/vehiculo.ts` | Sale `formatearIntervalo` (queda sin uso) |
| `tests/unit/vista-estado.test.ts`, `tests/unit/vehiculo.test.ts`, `tests/integracion/vehiculos.test.ts`, `tests/e2e/recorrido-propietario.spec.ts` | Pruebas |

## Preparación

- [ ] Con el PR del 2B mergeado: `git checkout main && git pull && git checkout -b iteracion-2c-pantallas`. Primer commit: este plan.

---

### Task 1: Reglas de los chips y componente

**Files:**
- Create: `src/dominio/vista-estado.ts`, `src/components/chip-estado.tsx`, `tests/unit/vista-estado.test.ts`

**Interfaces:**
- Consumes: tipos `Estado`, `Incertidumbre`, `ItemConEstado` de `@/dominio/motor`; `ResumenEstado` = `{ vencidos: number; proximos: number; inciertos: number }`.
- Produces: `type TipoChip = Estado | Incertidumbre`; `type Chip = { tipo: TipoChip; texto: string }`; `chipsDeItem(item: Pick<ItemConEstado, "estado" | "incertidumbre">): Chip[]`; `chipsDeResumen(r: { vencidos: number; proximos: number; inciertos: number }): Chip[]`; `textoInciertos(items: Pick<ItemConEstado, "incertidumbre">[]): string | null`; componente `<ChipEstado tipo texto />`.

- [ ] **Step 1: Prueba que falla** — `tests/unit/vista-estado.test.ts`:

```ts
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
    expect(chipsDeResumen({ vencidos: 1, proximos: 2, inciertos: 1 })).toEqual([
      { tipo: "vencido", texto: "1 vencido" },
      { tipo: "proximo", texto: "2 próximos" },
      { tipo: "a_confirmar", texto: "1 a confirmar" },
    ]);
    expect(chipsDeResumen({ vencidos: 3, proximos: 1, inciertos: 0 })).toEqual([
      { tipo: "vencido", texto: "3 vencidos" },
      { tipo: "proximo", texto: "1 próximo" },
    ]);
  });
  it("sin nada pendiente dice Todo al día", () => {
    expect(chipsDeResumen({ vencidos: 0, proximos: 0, inciertos: 0 })).toEqual([{ tipo: "al_dia", texto: "Todo al día" }]);
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
```

- [ ] **Step 2: Verificar que falla** — `npx vitest run --project unit tests/unit/vista-estado.test.ts` → FAIL (no existe el módulo).

- [ ] **Step 3: Implementación** — `src/dominio/vista-estado.ts`:

```ts
import type { Estado, Incertidumbre, ItemConEstado } from "@/dominio/motor";

export type TipoChip = Estado | Incertidumbre;
export type Chip = { tipo: TipoChip; texto: string };

const TEXTO: Record<TipoChip, string> = {
  vencido: "Vencido",
  proximo: "Próximo",
  al_dia: "Al día",
  a_confirmar: "A confirmar",
  verificar_en_taller: "Verificar en taller",
};

const chip = (tipo: TipoChip): Chip => ({ tipo, texto: TEXTO[tipo] });
const contar = (n: number, singular: string, plural: string) => `${n} ${n === 1 ? singular : plural}`;

/** Spec 3.3: un incierto nunca se ve "al día"; si está vencido o próximo, la marca va al lado. */
export function chipsDeItem(item: Pick<ItemConEstado, "estado" | "incertidumbre">): Chip[] {
  if (item.incertidumbre && item.estado === "al_dia") return [chip(item.incertidumbre)];
  return item.incertidumbre ? [chip(item.estado), chip(item.incertidumbre)] : [chip(item.estado)];
}

/** Mockup 04: "1 vencido", "2 próximos", "1 a confirmar" o "Todo al día". */
export function chipsDeResumen(r: { vencidos: number; proximos: number; inciertos: number }): Chip[] {
  const chips: Chip[] = [];
  if (r.vencidos > 0) chips.push({ tipo: "vencido", texto: contar(r.vencidos, "vencido", "vencidos") });
  if (r.proximos > 0) chips.push({ tipo: "proximo", texto: contar(r.proximos, "próximo", "próximos") });
  if (r.inciertos > 0) chips.push({ tipo: "a_confirmar", texto: `${r.inciertos} a confirmar` });
  return chips.length > 0 ? chips : [{ tipo: "al_dia", texto: "Todo al día" }];
}

/** Mockup 06: la línea sobre la lista cuando hay supuestos sin responder. */
export function textoInciertos(items: Pick<ItemConEstado, "incertidumbre">[]): string | null {
  const n = items.filter((i) => i.incertidumbre === "a_confirmar").length;
  if (n === 0) return null;
  return `${contar(n, "ítem", "ítems")} a confirmar. Lo supusimos porque el auto se cargó con más kilómetros que el intervalo.`;
}
```

`src/components/chip-estado.tsx`:

```tsx
import { CircleCheck, CircleHelp, OctagonAlert, TriangleAlert, type LucideIcon } from "lucide-react";
import type { TipoChip } from "@/dominio/vista-estado";

const ESTILO: Record<TipoChip, { clase: string; Icono: LucideIcon }> = {
  vencido: { clase: "bg-estado-vencido-fondo text-estado-vencido", Icono: OctagonAlert },
  proximo: { clase: "bg-estado-proximo-fondo text-estado-proximo", Icono: TriangleAlert },
  al_dia: { clase: "bg-estado-al-dia-fondo text-estado-al-dia", Icono: CircleCheck },
  a_confirmar: { clase: "bg-estado-confirmar-fondo text-estado-confirmar", Icono: CircleHelp },
  verificar_en_taller: { clase: "bg-estado-confirmar-fondo text-estado-confirmar", Icono: CircleHelp },
};

/** Chip de estado (DESIGN.md): pastilla con ícono y palabra, 13 px; nunca solo color. */
export function ChipEstado({ tipo, texto }: { tipo: TipoChip; texto: string }) {
  const { clase, Icono } = ESTILO[tipo];
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[13px] font-medium ${clase}`}>
      <Icono className="size-3.5" aria-hidden="true" />
      {texto}
    </span>
  );
}
```

- [ ] **Step 4: Verificar** — `npx vitest run --project unit tests/unit/vista-estado.test.ts` → 7 pasan. `npm run typecheck`, `npm run lint` limpios.

- [ ] **Step 5: Commit** — `git add src/dominio/vista-estado.ts src/components/chip-estado.tsx tests/unit/vista-estado.test.ts` · `git commit -m "feat: chips de estado y su resumen (DESIGN.md, mockups 04 y 06)"`

---

### Task 2: Sección "Mantenimiento" en la ficha

**Files:**
- Modify: `src/app/(propietario)/vehiculos/[id]/page.tsx`, `src/datos/vehiculos.ts`, `src/dominio/vehiculo.ts`, `tests/unit/vehiculo.test.ts`, `tests/integracion/vehiculos.test.ts`, `tests/e2e/recorrido-propietario.spec.ts`

- [ ] **Step 1: Prueba que falla** — en `tests/e2e/recorrido-propietario.spec.ts`, paso "CU-05: agregar un Ford Ka 2014", después de la aserción de "45.000 km":

```ts
    // CU-09: con 45.000 km de alta, el aceite (cada 15.000) queda supuesto a los 30.000 y vencido.
    await expect(page.getByRole("heading", { name: "Mantenimiento" })).toBeVisible();
    const aceite = page.getByRole("listitem").filter({ hasText: "Aceite y filtro de aceite" });
    await expect(aceite.getByText("Vencido")).toBeVisible();
    await expect(aceite.getByText("A confirmar")).toBeVisible();
```

- [ ] **Step 2: Verificar que falla** — `npx playwright test` (con el servidor de desarrollo; la red del celular) → FAIL en "Mantenimiento" (la ficha todavía muestra "Plan del fabricante").

- [ ] **Step 3: Implementación** — en `src/app/(propietario)/vehiculos/[id]/page.tsx`:
  - Imports: quitar `formatearIntervalo`; sumar `import { ChipEstado } from "@/components/chip-estado";`, `import { estadoDelVehiculo } from "@/datos/estado";`, `import { chipsDeItem, textoInciertos } from "@/dominio/vista-estado";`, `import { cn } from "@/lib/utils";`.
  - Lectura: `const [v, estado] = await Promise.all([obtenerVehiculo(claims, id), estadoDelVehiculo(claims, id)]);` (y `if (!v) notFound();` como está).
  - Reemplazar todo el bloque desde `<h2 className="mt-8 text-[17px] font-semibold">Plan del fabricante</h2>` hasta el cierre del condicional `v.plan ? (…) : (…)` por:

```tsx
      <h2 className="mt-8 text-[17px] font-semibold">Mantenimiento</h2>
      {estado?.catalogado ? (
        <>
          {textoInciertos(estado.items) && (
            <p className="mt-1 text-sm text-muted-foreground">{textoInciertos(estado.items)}</p>
          )}
          {/* CU-09 / RF-12: ya vienen ordenados por urgencia desde el motor. */}
          <ul className="mt-3 space-y-2">
            {estado.items.map((i) => (
              <li
                key={i.itemId}
                className={cn(
                  "flex items-start justify-between gap-3 rounded-[14px] border bg-card p-4",
                  i.incertidumbre ? "border-dashed border-estado-confirmar-borde" : "border-border",
                )}
              >
                <div className="min-w-0">
                  <p className="font-medium">{i.nombre}</p>
                  <p className="text-sm text-muted-foreground tabular-nums">{i.detalle}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {chipsDeItem(i).map((c) => (
                    <ChipEstado key={c.tipo} {...c} />
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className="mt-3">
          <Aviso tipo="advertencia">
            Todavía no tenemos el plan de mantenimiento de este modelo. Vas a poder registrar los trabajos que le
            hagas.
          </Aviso>
        </div>
      )}
```

  - En `src/datos/vehiculos.ts`: quitar `ItemPlan`, el campo `plan` de `VehiculoDetalle`, la consulta del plan y el `plan: plan && {…}` de `obtenerVehiculo`.
  - En `src/dominio/vehiculo.ts`: quitar `formatearIntervalo` (y su `describe` en `tests/unit/vehiculo.test.ts`, con su import).
  - En `tests/integracion/vehiculos.test.ts`: en "registra un modelo libre (3a) sin plan", quitar `plan: null` del `toMatchObject`; quitar el caso "trae el plan publicado del modelo con sus 8 ítems" (lo cubre `tests/integracion/estado.test.ts`).

- [ ] **Step 4: Verificar** — `npx playwright test` → pasa. `npm run test:cobertura`, `npx vitest run --project integracion tests/integracion/vehiculos.test.ts`, `npm run typecheck`, `npm run lint`.

- [ ] **Step 5: Commit** — `git add src tests` · `git commit -m "feat: sección Mantenimiento de la ficha con el semáforo (CU-09, RF-12)"`

---

### Task 3: Chips de resumen en "Mis vehículos" y verificación visual

**Files:**
- Modify: `src/app/(propietario)/vehiculos/page.tsx`

- [ ] **Step 1: Prueba que falla** — en `tests/e2e/recorrido-propietario.spec.ts`, al final del paso "CU-08 4a: rechazar una lectura menor", después de `page.keyboard.press("Escape")`:

```ts
    // Mockup 04: la tarjeta del vehículo resume su estado.
    await page.getByRole("link", { name: "Volver" }).click();
    await expect(page.getByRole("heading", { name: "Mis vehículos" })).toBeVisible();
    await expect(page.getByText(/^\d+ vencidos?$/)).toBeVisible();
```

- [ ] **Step 2: Verificar que falla** — `npx playwright test` → FAIL en el chip de vencidos.

- [ ] **Step 3: Implementación** — en `src/app/(propietario)/vehiculos/page.tsx`:
  - Imports: `ChipEstado`, `resumenesDeMisVehiculos` de `@/datos/estado`, `chipsDeResumen` de `@/dominio/vista-estado`.
  - Lectura: `const [vehiculos, resumenes] = await Promise.all([listarVehiculos(claims), resumenesDeMisVehiculos(claims)]);`
  - La tarjeta (`<Link …>`) pasa a columna: el contenido actual queda en una fila (`<span className="flex items-center justify-between gap-3">…</span>`) y debajo, si `resumenes[v.id]` no es null:

```tsx
                {resumenes[v.id] && (
                  <span className="mt-3 flex flex-wrap gap-1.5">
                    {chipsDeResumen(resumenes[v.id]!).map((c) => (
                      <ChipEstado key={c.tipo} {...c} />
                    ))}
                  </span>
                )}
```

    con el `className` del `Link` cambiado a `"block rounded-[14px] border border-border bg-card p-4 transition-colors hover:bg-muted"`.

- [ ] **Step 4: Verificar** — `npx playwright test` → pasa.

- [ ] **Step 5: Verificación visual** — con una cuenta temporal de desarrollo (creada y borrada por un script de Playwright, como en la 1E), capturas de "Mis vehículos" y de la ficha de un Ka con 62.400 km, en Pixel 7 y en escritorio de 1280 px. Revisar contra los mockups 04, 06 y 12: chips con ícono y palabra, borde punteado en los inciertos, orden por urgencia, sin desborde horizontal (`scrollWidth - innerWidth = 0`).

- [ ] **Step 6: Commit y PR** — `git add src tests` · `git commit -m "feat: chips de resumen en Mis vehículos (mockup 04)"`; escaneo de secretos; push; `gh pr create --title "Iteración 2C: ficha y lista con el estado"`; merge con los checks en verde (autorizado por Felipe el 12/10/2026). Después del despliegue, la ficha de producción del Ka de Felipe recibe sus supuestos en la primera consulta.
