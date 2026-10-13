# Iteración 2D — Confirmación de supuestos y alta: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el propietario confirme, corrija o deje "a verificar" los supuestos de su vehículo (CU-06, RF-09) en la pantalla `/vehiculos/[id]/confirmar` (mockup 13), que el alta lo lleve ahí cuando se crearon supuestos (CU-05) y que la ficha ofrezca "Confirmar dato" en cada fila incierta (mockup 06).

**Architecture:** Las reglas de la pantalla (qué fila abre, cuándo terminó, adónde va el alta) son puras, en `src/dominio/confirmacion.ts`, con pruebas unitarias. Una sola Server Action (`responderSupuesto`) despacha las tres respuestas a `confirmarSupuesto`, `corregirSupuesto` y `marcarAVerificar` (plan 2B, ya probadas en integración). La página es un Server Component; la lista con una fila abierta a la vez es un componente de cliente.

**Tech Stack:** Next.js 16 (Server Components, Server Actions), React 19 `useActionState`, Tailwind 4, lucide-react, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-12-iteracion-2-motor-design.md`, apartados 2, 4.2 y 5 · `DESIGN.md` · Mockups `docs/diseno/pantallas/mobile/13` (estados 1 y 2) y `06`.

## Global Constraints

- Una fila abierta a la vez. Fila abierta, modo confirmar: campo de fecha "¿Cuándo se hizo?", botón principal "Sí, se hizo", enlaces "Fue en otro momento" y "No lo sé". Modo corregir: "Kilometraje" (sufijo km) y "Fecha", botón "Guardar" y enlace "Cancelar" (mockup 13).
- Textos exactos: introducción desde el alta "Como cargaste el {vehículo} con {km} km, supusimos cuándo se hizo por última vez cada uno de estos trabajos. Confirmalo si lo sabés: así el cálculo usa también las fechas."; supuesto "Supuesto a los {km} km"; botón al pie desde el alta "Más tarde".
- Validaciones (spec 5, 2d): las de `src/dominio/supuestos.ts`; los mensajes se muestran debajo del campo y la fila conserva lo que se escribió.
- "No lo sé" deja el ítem `supuesta_a_verificar`: sigue en la lista con el chip "Verificar en taller" y la ficha conserva su enlace "Confirmar dato".
- La pantalla termina (vuelve a la ficha) cuando no queda ningún supuesto sin responder; "No lo sé" cuenta como respuesta.
- Sin texto de introducción ni "Más tarde" si no se viene del alta (spec 5).
- Escritorio: el mismo contenido en la columna de 720 px.

## Review Focus

1. **`?item=` inválido, de otro vehículo o ya respondido:** la pantalla abre el primer supuesto sin responder, sin error (Task 1).
2. **Entrar a `/confirmar` de un vehículo sin supuestos o de otro propietario:** sin supuestos vuelve a la ficha; ajeno o inexistente da 404 (Task 2).
3. **Error de validación:** la fila queda abierta, en el mismo modo, con lo escrito y el mensaje (Task 2).
4. **El dato ya se respondió en otra pestaña:** se muestra "Ese dato ya no está para confirmar…" en la fila, sin romper la pantalla (Task 2).
5. **Teclado y lector de pantalla:** cada fila cerrada es un botón con `aria-expanded`; los campos tienen etiqueta (Task 2, verificación visual).

## Mapa de archivos

| Archivo | Responsabilidad |
|---|---|
| `src/dominio/confirmacion.ts` | `filaAbierta`, `terminoLaConfirmacion`, `destinoDelAlta` |
| `src/app/(propietario)/vehiculos/[id]/confirmar/page.tsx` | Página (Server Component) |
| `src/app/(propietario)/vehiculos/[id]/confirmar/supuestos.tsx` | Lista con una fila abierta (cliente) |
| `src/app/(propietario)/vehiculos/[id]/confirmar/acciones.ts` | `responderSupuesto` |
| `src/app/(propietario)/vehiculos/acciones.ts` | El alta redirige con `destinoDelAlta` |
| `src/app/(propietario)/vehiculos/[id]/page.tsx` | Enlace "Confirmar dato" en las filas inciertas |
| `tests/unit/confirmacion.test.ts`, `tests/e2e/recorrido-propietario.spec.ts` | Pruebas |

## Preparación

- [ ] Con el PR del 2C mergeado: `git checkout main && git pull && git checkout -b iteracion-2d-confirmar`. Primer commit: este plan.

---

### Task 1: Reglas de la pantalla

**Files:**
- Create: `src/dominio/confirmacion.ts`, `tests/unit/confirmacion.test.ts`

**Interfaces:**
- Produces: `type Supuesto = { itemId: number; origen: "supuesta_pendiente" | "supuesta_a_verificar" }`; `filaAbierta(supuestos: Supuesto[], pedida: string | undefined): number | null`; `terminoLaConfirmacion(supuestos: Supuesto[]): boolean`; `destinoDelAlta(id: string, conSupuestos: boolean): string`.

- [ ] **Step 1: Prueba que falla** — `tests/unit/confirmacion.test.ts`:

```ts
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
```

- [ ] **Step 2: Verificar que falla** — `npx vitest run --project unit tests/unit/confirmacion.test.ts` → FAIL (no existe el módulo).

- [ ] **Step 3: Implementación** — `src/dominio/confirmacion.ts`:

```ts
export type Supuesto = { itemId: number; origen: "supuesta_pendiente" | "supuesta_a_verificar" };

/** Mockup 13: una fila abierta a la vez. La pedida por "Confirmar dato" o el primer supuesto sin responder. */
export function filaAbierta(supuestos: Supuesto[], pedida: string | undefined): number | null {
  const id = pedida && /^\d+$/.test(pedida) ? Number(pedida) : null;
  if (id !== null && supuestos.some((s) => s.itemId === id)) return id;
  return (supuestos.find((s) => s.origen === "supuesta_pendiente") ?? supuestos[0])?.itemId ?? null;
}

/** Spec 5: la pantalla vuelve a la ficha cuando no queda nada sin responder ("No lo sé" es una respuesta). */
export function terminoLaConfirmacion(supuestos: Supuesto[]): boolean {
  return !supuestos.some((s) => s.origen === "supuesta_pendiente");
}

/** CU-05: si el alta creó supuestos, se confirman antes de ver la ficha. */
export function destinoDelAlta(id: string, conSupuestos: boolean): string {
  return conSupuestos ? `/vehiculos/${id}/confirmar?desde=alta` : `/vehiculos/${id}`;
}
```

- [ ] **Step 4: Verificar** — el mismo comando → PASS (5 pruebas).

- [ ] **Step 5: Commit** — `git add src/dominio/confirmacion.ts tests/unit/confirmacion.test.ts` · `git commit -m "feat: reglas de la pantalla de confirmación (CU-06, mockup 13)"`

---

### Task 2: Pantalla "Confirmar datos" y su acción

**Files:**
- Create: `src/app/(propietario)/vehiculos/[id]/confirmar/acciones.ts`, `…/confirmar/supuestos.tsx`, `…/confirmar/page.tsx`
- Modify: `tests/e2e/recorrido-propietario.spec.ts`

**Interfaces:**
- Consumes: Task 1; `supuestosDelVehiculo`, `confirmarSupuesto`, `corregirSupuesto`, `marcarAVerificar` y `SupuestoPendiente` de `@/datos/estado`; `obtenerVehiculo` de `@/datos/vehiculos`; `fechaDeHoy` de `@/dominio/fechas`; `formatearKm`; `Campo`, `Button`, `ChipEstado`.
- Produces: `responderSupuesto(vehiculoId: string, itemId: number, previo: EstadoRespuesta, datos: FormData): Promise<EstadoRespuesta>` con `type EstadoRespuesta = { errores?: ErroresCampo; valores?: { fecha?: string; km?: string } }`.

- [ ] **Step 1: Prueba que falla (punta a punta, corre en el CI por la decisión del 12/10)** — en `tests/e2e/recorrido-propietario.spec.ts`, paso "CU-05", reemplazar desde el clic en "Agregar vehículo" hasta la aserción de "45.000 km" por:

```ts
    await page.getByRole("button", { name: "Agregar vehículo" }).click();
    // CU-05 → CU-06: con 45.000 km se supusieron aceite, pastillas, amortiguadores y neumáticos.
    await expect(page.getByRole("heading", { name: "Confirmar datos" })).toBeVisible();
    await expect(page.getByText(/^Como cargaste el Ford Ka con 45\.000 km/)).toBeVisible();
    await page.getByRole("button", { name: /^Neumáticos/ }).click();
    await page.getByLabel("¿Cuándo se hizo?").fill("2026-01-15");
    await page.getByRole("button", { name: "Sí, se hizo" }).click();
    await expect(page.getByRole("button", { name: /^Neumáticos/ })).toHaveCount(0);
    await page.getByRole("link", { name: "Más tarde" }).click();
    await expect(page.getByRole("heading", { name: "Ford Ka 2014" })).toBeVisible();
    await expect(page.getByText("45.000 km", { exact: true })).toBeVisible();
```

  y, después de las aserciones del aceite, sumar:

```ts
    const neumaticos = page.getByRole("listitem").filter({ hasText: "Neumáticos" });
    await expect(neumaticos.getByText("A confirmar")).toHaveCount(0);
```

- [ ] **Step 2: Verificar que falla** — en el CI del PR (FAIL en "Confirmar datos": el alta todavía va a la ficha). Localmente: `npm run typecheck` y `npm run lint` en verde.

- [ ] **Step 3: Acción** — `src/app/(propietario)/vehiculos/[id]/confirmar/acciones.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { confirmarSupuesto, corregirSupuesto, marcarAVerificar, supuestosDelVehiculo } from "@/datos/estado";
import { exigirClaims } from "@/datos/sesion";
import { terminoLaConfirmacion } from "@/dominio/confirmacion";
import type { ErroresCampo } from "@/dominio/cuenta";

export type EstadoRespuesta = { errores?: ErroresCampo; valores?: { fecha?: string; km?: string } };

/** CU-06: "Sí, se hizo" (fecha), "Fue en otro momento" (km + fecha) o "No lo sé". */
export async function responderSupuesto(
  vehiculoId: string,
  itemId: number,
  _previo: EstadoRespuesta,
  datos: FormData,
): Promise<EstadoRespuesta> {
  const claims = await exigirClaims();
  const respuesta = datos.get("respuesta");
  const fecha = datos.get("fecha");
  const km = datos.get("km");
  const r =
    respuesta === "no_lo_se"
      ? await marcarAVerificar(claims, vehiculoId, itemId)
      : respuesta === "corregir"
        ? await corregirSupuesto(claims, vehiculoId, itemId, km, fecha)
        : await confirmarSupuesto(claims, vehiculoId, itemId, fecha);
  if (!r.ok) {
    return { errores: r.errores, valores: { fecha: String(fecha ?? ""), km: String(km ?? "") } };
  }
  revalidatePath(`/vehiculos/${vehiculoId}`);
  revalidatePath("/vehiculos");
  const quedan = await supuestosDelVehiculo(claims, vehiculoId);
  if (!quedan || terminoLaConfirmacion(quedan.supuestos)) redirect(`/vehiculos/${vehiculoId}`);
  revalidatePath(`/vehiculos/${vehiculoId}/confirmar`);
  return {};
}
```

- [ ] **Step 4: Lista (cliente)** — `src/app/(propietario)/vehiculos/[id]/confirmar/supuestos.tsx`:

```tsx
"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useActionState, useState } from "react";
import { ChipEstado } from "@/components/chip-estado";
import { Campo } from "@/components/campo";
import { Aviso } from "@/components/aviso";
import { Button } from "@/components/ui/button";
import { responderSupuesto, type EstadoRespuesta } from "./acciones";

export type FilaSupuesto = {
  itemId: number;
  nombre: string;
  km: string; // ya formateado: "60.000"
  origen: "supuesta_pendiente" | "supuesta_a_verificar";
};

/** Mockup 13: una fila abierta a la vez. */
export function ListaSupuestos({
  vehiculoId,
  filas,
  abierta: inicial,
}: {
  vehiculoId: string;
  filas: FilaSupuesto[];
  abierta: number | null;
}) {
  const [abierta, setAbierta] = useState(inicial);
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-[14px] border border-border bg-card">
      {filas.map((f) => (
        <li key={f.itemId}>
          {abierta === f.itemId ? (
            <FilaAbierta vehiculoId={vehiculoId} fila={f} onCerrar={() => setAbierta(null)} />
          ) : (
            <button
              type="button"
              aria-expanded={false}
              onClick={() => setAbierta(f.itemId)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted"
            >
              <Encabezado fila={f} />
              <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

function Encabezado({ fila }: { fila: FilaSupuesto }) {
  return (
    <span className="min-w-0">
      <span className="block font-medium">{fila.nombre}</span>
      <span className="block text-sm text-muted-foreground tabular-nums">Supuesto a los {fila.km} km</span>
      {fila.origen === "supuesta_a_verificar" && (
        <span className="mt-1 inline-block">
          <ChipEstado tipo="verificar_en_taller" texto="Verificar en taller" />
        </span>
      )}
    </span>
  );
}

function FilaAbierta({ vehiculoId, fila, onCerrar }: { vehiculoId: string; fila: FilaSupuesto; onCerrar: () => void }) {
  const [modo, setModo] = useState<"confirmar" | "corregir">("confirmar");
  const [estado, enviar, enviando] = useActionState(
    (previo: EstadoRespuesta, datos: FormData) => responderSupuesto(vehiculoId, fila.itemId, previo, datos),
    {},
  );
  const e = estado.errores;
  const enlace = "text-sm font-medium text-primary underline-offset-4 hover:underline";

  return (
    <div className="px-4 py-3">
      <button
        type="button"
        aria-expanded={true}
        onClick={onCerrar}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <Encabezado fila={fila} />
        <ChevronUp className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </button>
      <form action={enviar} className="mt-3 space-y-4 border-t border-border pt-3">
        {e?.formulario && <Aviso tipo="error">{e.formulario}</Aviso>}
        {modo === "corregir" && (
          <Campo
            id={`km-${fila.itemId}`}
            etiqueta="Kilometraje"
            nombre="km"
            inputMode="numeric"
            sufijo="km"
            valorInicial={estado.valores?.km}
            error={e?.km}
          />
        )}
        <Campo
          id={`fecha-${fila.itemId}`}
          etiqueta={modo === "corregir" ? "Fecha" : "¿Cuándo se hizo?"}
          nombre="fecha"
          tipo="date"
          valorInicial={estado.valores?.fecha}
          error={e?.fecha}
        />
        {modo === "confirmar" ? (
          <>
            <Button type="submit" name="respuesta" value="confirmar" className="h-12 w-full" disabled={enviando}>
              Sí, se hizo
            </Button>
            <div className="flex items-center justify-center gap-4">
              <button type="button" className={enlace} onClick={() => setModo("corregir")}>
                Fue en otro momento
              </button>
              <span className="h-4 w-px bg-border" aria-hidden="true" />
              <button type="submit" name="respuesta" value="no_lo_se" className={enlace} disabled={enviando}>
                No lo sé
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-4">
            <Button type="submit" name="respuesta" value="corregir" className="h-12 flex-1" disabled={enviando}>
              Guardar
            </Button>
            <button type="button" className={enlace} onClick={() => setModo("confirmar")}>
              Cancelar
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
```

  Antes de escribirlo: confirmar que `Aviso` acepta `tipo="error"` y que `Campo` pasa `tipo="date"` al input (leer `src/components/aviso.tsx` y `campo.tsx`); si `Aviso` no tiene `error`, usar el tipo que el componente ofrezca para errores y anotar la decisión.

- [ ] **Step 5: Página** — `src/app/(propietario)/vehiculos/[id]/confirmar/page.tsx`:

```tsx
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { supuestosDelVehiculo } from "@/datos/estado";
import { exigirClaims } from "@/datos/sesion";
import { obtenerVehiculo } from "@/datos/vehiculos";
import { filaAbierta } from "@/dominio/confirmacion";
import { formatearKm } from "@/dominio/kilometraje";
import { ListaSupuestos } from "./supuestos";

export const metadata: Metadata = { title: "Confirmar datos · Libreta de service" };

export default async function ConfirmarPagina({ params, searchParams }: PageProps<"/vehiculos/[id]/confirmar">) {
  const { id } = await params;
  const { desde, item } = await searchParams;
  const claims = await exigirClaims();
  const [v, s] = await Promise.all([obtenerVehiculo(claims, id), supuestosDelVehiculo(claims, id)]);
  if (!v || !s) notFound();
  if (s.supuestos.length === 0) redirect(`/vehiculos/${id}`);
  const deAlta = desde === "alta";
  const abierta = filaAbierta(s.supuestos, typeof item === "string" ? item : undefined);
  const filas = s.supuestos.map((x) => ({ ...x, km: formatearKm(x.km) }));

  return (
    <section>
      <Link href={`/vehiculos/${id}`} className="mb-4 inline-flex items-center gap-1 text-sm">
        <ArrowLeft className="size-4" aria-hidden="true" /> Volver
      </Link>
      <h1 className="text-[22px] font-semibold">Confirmar datos</h1>
      {deAlta && (
        <p className="mt-3">
          Como cargaste el {v.nombre} con {formatearKm(s.kmActual)} km, supusimos cuándo se hizo por última vez cada
          uno de estos trabajos. Confirmalo si lo sabés: así el cálculo usa también las fechas.
        </p>
      )}
      <div className="mt-6">
        {/* La clave remonta la lista cuando cambia qué falta responder, para abrir la fila que sigue. */}
        <ListaSupuestos
          key={s.supuestos.map((x) => `${x.itemId}:${x.origen}`).join(",")}
          vehiculoId={id}
          filas={filas}
          abierta={abierta}
        />
      </div>
      {deAlta && (
        <Button asChild variant="outline" className="mt-6 h-12 w-full">
          <Link href={`/vehiculos/${id}`}>Más tarde</Link>
        </Button>
      )}
    </section>
  );
}
```

  Antes de escribirlo: confirmar en `node_modules/next/dist/docs/` que `PageProps<"/ruta">` tipa `searchParams` como `Promise<Record<string, string | string[] | undefined>>` en esta versión.

- [ ] **Step 6: Verificar** — `npm run typecheck`, `npm run lint`, `npm run test:cobertura`.

- [ ] **Step 7: Commit** — `git add src tests` · `git commit -m "feat: pantalla Confirmar datos (CU-06, mockup 13)"`

---

### Task 3: Alta y ficha llevan a confirmar; verificación visual

**Files:**
- Modify: `src/app/(propietario)/vehiculos/acciones.ts`, `src/app/(propietario)/vehiculos/[id]/page.tsx`

- [ ] **Step 1: Alta** — en `agregarVehiculo`: `import { destinoDelAlta } from "@/dominio/confirmacion";` y `redirect(destinoDelAlta(r.valor.id, r.valor.conSupuestos));`.

- [ ] **Step 2: Ficha** — en la fila de `estado.items`, debajo del detalle, si `i.incertidumbre`:

```tsx
                  {i.incertidumbre && (
                    <Link
                      href={`/vehiculos/${v.id}/confirmar?item=${i.itemId}`}
                      className="mt-2 inline-block text-sm font-medium text-primary underline underline-offset-4"
                    >
                      Confirmar dato
                    </Link>
                  )}
```

- [ ] **Step 3: Verificar** — `npm run typecheck`, `npm run lint`, `npm run test:cobertura`.

- [ ] **Step 4: Verificación visual** — cuenta temporal de desarrollo (enlace de confirmación generado, sin correo; borrada al final). Ka 2014 con 62.400 km, en 375 px y 1280 px: la pantalla del alta contra el mockup 13 (estado 1); "Fue en otro momento" con 63.000 km muestra el error del estado 2 y conserva lo escrito; una fecha futura muestra su error; "No lo sé" deja la fila con "Verificar en taller"; confirmar el resto vuelve a la ficha; "Confirmar dato" de la ficha abre esa fila; `?item=abc` abre la primera; sin desborde horizontal; consola y servidor sin errores.

- [ ] **Step 5: Commit y PR** — `git add src` · `git commit -m "feat: el alta y la ficha llevan a confirmar los supuestos (CU-05, CU-06)"`; escaneo de secretos; push; `gh pr create --title "Iteración 2D: confirmación de supuestos"`; revisión final; merge con los checks en verde (autorizado por Felipe el 12/10/2026).
