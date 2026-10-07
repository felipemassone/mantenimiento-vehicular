# Iteración 1C — Vehículos: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el propietario registre un vehículo del catálogo o de un modelo no catalogado, lo vea en su lista y en su ficha, lo edite o lo elimine, y actualice su kilometraje sin que el odómetro pueda retroceder (CU-05, CU-07, CU-08; RF-05 a RF-07). Cumple el resultado verificable de la Tabla 8: *un usuario crea su cuenta y registra un vehículo de un modelo catalogado*.

**Architecture:** Reglas en `src/dominio/vehiculo.ts` y `src/dominio/fechas.ts` (sin dependencias). Acceso a datos en `src/datos/vehiculos.ts`, siempre con `conUsuario` (RLS); la actualización del kilometraje bloquea la fila del vehículo con `SELECT … FOR UPDATE` dentro de la misma transacción (spec 4.2). Server Actions en `src/app/(propietario)/vehiculos/acciones.ts`. Un único formulario cliente sirve al alta y a la edición.

**Tech Stack:** Next.js 16, React 19 (`useActionState`), Prisma 7 vía `conUsuario`, Zod 4, shadcn/ui (Button, Dialog), Vitest.

**Spec:** `docs/superpowers/specs/2026-10-05-iteracion-1-base-design.md` (apartado 6) · Fichas CU-05, CU-07 y CU-08 (Tablas 13, 15 y 16 del informe) · Diseño: `docs/diseno/pantallas/mobile/04` a `07` y `web/12`.

## Global Constraints

- Todo lo de los planes 1A y 1B sigue vigente (capas, claves, commits, textos en rioplatense, tokens del DESIGN.md, `exigirClaims()` en cada página y acción, `node_modules/next/dist/docs/` antes de usar una API de Next).
- **Límite de la iteración:** los pasos que incluyen CU-14 (CU-05 paso 6, CU-07 paso 5, CU-08 paso 6) se implementan en la Iteración 2. En la ficha se muestra el plan del fabricante (ítems e intervalos) sin estado.
- Números con formato `es-AR` y cifras tabulares (`tabular-nums`); fechas `dd/mm/aaaa`; la "fecha del día" es la de Argentina (`America/Argentina/Buenos_Aires`).
- El kilometraje se acepta escrito con o sin punto de miles (`62400` o `62.400`).
- Las pruebas de integración necesitan una red que permita el puerto 6543 (no la de la facultad).

## Ajuste respecto de la especificación

- **Apartado 6, "Mis vehículos":** la spec dice que con un solo vehículo se abre su ficha directamente. No se hace: dejaría sin acceso al botón "Agregar vehículo". La lista se muestra siempre. Se registra en la spec en la Task 6.

## Mapa de archivos

| Archivo | Responsabilidad |
|---|---|
| `src/dominio/fechas.ts` | `fechaDeHoy()`, `formatearFecha()` |
| `src/dominio/vehiculo.ts` | Esquemas, `parsearVehiculo()`, `validarAnioDelModelo()`, `aniosDelModelo()`, `nombreVehiculo()`, `formatearIntervalo()` |
| `src/datos/vehiculos.ts` | Catálogo publicado, listar, obtener, crear, actualizar, eliminar, registrar lectura |
| `src/components/selector.tsx` | `<select>` nativo con el estilo de `Campo` |
| `src/app/(propietario)/vehiculos/acciones.ts` | Server Actions |
| `src/app/(propietario)/vehiculos/formulario.tsx` | Formulario de alta y edición (catálogo o libre) |
| `src/app/(propietario)/vehiculos/page.tsx` | Mis vehículos |
| `src/app/(propietario)/vehiculos/nuevo/page.tsx` | Agregar vehículo |
| `src/app/(propietario)/vehiculos/[id]/page.tsx` | Ficha del vehículo |
| `src/app/(propietario)/vehiculos/[id]/kilometraje.tsx` | Diálogo "Actualizar kilometraje" |
| `src/app/(propietario)/vehiculos/[id]/eliminar.tsx` | Diálogo "Eliminar vehículo" |
| `src/app/(propietario)/vehiculos/[id]/editar/page.tsx` | Editar vehículo |
| `tests/unit/fechas.test.ts`, `tests/unit/vehiculo.test.ts` | Reglas |
| `tests/integracion/vehiculos.test.ts` | Datos con RLS |

---

### Task 1: Fechas de Argentina

**Files:**
- Create: `src/dominio/fechas.ts`, `tests/unit/fechas.test.ts`

**Interfaces:**
- Produces: `fechaDeHoy(ahora?: Date): Date` (medianoche UTC del día calendario de Argentina, lista para una columna `@db.Date`); `formatearFecha(fecha: Date): string` (`dd/mm/aaaa`, leyendo las partes UTC).

- [ ] **Step 1: Prueba que falla**

`tests/unit/fechas.test.ts`:

```ts
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
```

Run: `npm test` → FAIL, `Cannot find package '@/dominio/fechas'`.

- [ ] **Step 2: Implementar**

`src/dominio/fechas.ts`:

```ts
const ZONA = "America/Argentina/Buenos_Aires";
const diaArgentino = new Intl.DateTimeFormat("en-CA", { timeZone: ZONA, year: "numeric", month: "2-digit", day: "2-digit" });

/** Día calendario de Argentina como medianoche UTC (lo que guarda una columna DATE). */
export function fechaDeHoy(ahora: Date = new Date()): Date {
  return new Date(`${diaArgentino.format(ahora)}T00:00:00Z`);
}

/** dd/mm/aaaa a partir de una fecha DATE (medianoche UTC). */
export function formatearFecha(fecha: Date): string {
  const d = String(fecha.getUTCDate()).padStart(2, "0");
  const m = String(fecha.getUTCMonth() + 1).padStart(2, "0");
  return `${d}/${m}/${fecha.getUTCFullYear()}`;
}
```

Run: `npm test` → PASS.

- [ ] **Step 3: Commit**

```bash
git add src/dominio/fechas.ts tests/unit/fechas.test.ts
git commit -m "feat: fecha del día de Argentina y formato dd/mm/aaaa" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Reglas del vehículo

**Files:**
- Create: `src/dominio/vehiculo.ts`, `tests/unit/vehiculo.test.ts`

**Interfaces:**
- Consumes: `formatearKm` de `@/dominio/kilometraje`; `erroresDe`, `ErroresCampo` de `@/dominio/cuenta`.
- Produces:
  - `type DatosVehiculo = { tipo: "catalogo"; modeloId: number; anio: number } | { tipo: "libre"; marca: string; modelo: string; anio: number }`
  - `parsearVehiculo(entrada: Record<string, unknown>, conKilometraje: boolean): { ok: true; datos: DatosVehiculo; kilometraje: number | null } | { ok: false; errores: ErroresCampo }`
  - `validarAnioDelModelo(anio: number, desde: number, hasta: number | null): ResultadoValidacion`
  - `aniosDelModelo(desde: number, hasta: number | null, actual: number): number[]` (descendente)
  - `nombreVehiculo(v: { marca?: string | null; modelo?: string | null; marcaLibre?: string | null; modeloLibre?: string | null }): string`
  - `formatearIntervalo(km: number, meses: number | null): string`

- [ ] **Step 1: Prueba que falla**

`tests/unit/vehiculo.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  aniosDelModelo,
  formatearIntervalo,
  nombreVehiculo,
  parsearVehiculo,
  validarAnioDelModelo,
} from "@/dominio/vehiculo";

describe("parsearVehiculo (CU-05 pasos 3–4)", () => {
  it("acepta un vehículo del catálogo con kilometraje con punto de miles", () => {
    const r = parsearVehiculo({ tipo: "catalogo", modeloId: "3", anio: "2014", kilometraje: "62.400" }, true);
    expect(r).toEqual({ ok: true, datos: { tipo: "catalogo", modeloId: 3, anio: 2014 }, kilometraje: 62400 });
  });

  it("acepta un auto 0 km", () => {
    const r = parsearVehiculo({ tipo: "catalogo", modeloId: "3", anio: "2026", kilometraje: "0" }, true);
    expect(r.ok && r.kilometraje).toBe(0);
  });

  it("un kilometraje vacío no se toma como 0", () => {
    const r = parsearVehiculo({ tipo: "catalogo", modeloId: "3", anio: "2014", kilometraje: "" }, true);
    expect(r).toEqual({ ok: false, errores: { kilometraje: "Ingresá un kilometraje válido." } });
  });

  it("rechaza un kilometraje negativo o con decimales", () => {
    expect(parsearVehiculo({ tipo: "catalogo", modeloId: "3", anio: "2014", kilometraje: "-5" }, true).ok).toBe(false);
    expect(parsearVehiculo({ tipo: "catalogo", modeloId: "3", anio: "2014", kilometraje: "100,5" }, true).ok).toBe(false);
  });

  it("exige elegir modelo y año", () => {
    const r = parsearVehiculo({ tipo: "catalogo", modeloId: "", anio: "", kilometraje: "1000" }, true);
    expect(r).toEqual({ ok: false, errores: { modeloId: "Elegí un modelo.", anio: "Elegí el año." } });
  });

  it("acepta un modelo libre (CU-05 3a) y recorta espacios", () => {
    const r = parsearVehiculo({ tipo: "libre", marca: " Peugeot ", modelo: "208", anio: "2019", kilometraje: "41000" }, true);
    expect(r).toEqual({ ok: true, datos: { tipo: "libre", marca: "Peugeot", modelo: "208", anio: 2019 }, kilometraje: 41000 });
  });

  it("en el modelo libre exige marca y modelo", () => {
    const r = parsearVehiculo({ tipo: "libre", marca: "", modelo: " ", anio: "2019", kilometraje: "1" }, true);
    expect(r).toEqual({ ok: false, errores: { marca: "Ingresá la marca.", modelo: "Ingresá el modelo." } });
  });

  it("sin kilometraje (edición, CU-07) no lo pide", () => {
    const r = parsearVehiculo({ tipo: "catalogo", modeloId: "3", anio: "2014" }, false);
    expect(r).toEqual({ ok: true, datos: { tipo: "catalogo", modeloId: 3, anio: 2014 }, kilometraje: null });
  });
});

describe("validarAnioDelModelo (CU-05 4a)", () => {
  it("acepta un año dentro del rango", () => {
    expect(validarAnioDelModelo(2014, 2008, 2016)).toEqual({ ok: true });
  });

  it("rechaza un año fuera del rango indicando el rango", () => {
    expect(validarAnioDelModelo(2018, 2008, 2016)).toEqual({ ok: false, mensaje: "Este modelo está cargado de 2008 a 2016." });
    expect(validarAnioDelModelo(2005, 2010, null)).toEqual({ ok: false, mensaje: "Este modelo está cargado desde 2010." });
  });
});

describe("aniosDelModelo", () => {
  it("lista del más nuevo al más viejo; sin año final llega al año siguiente", () => {
    expect(aniosDelModelo(2014, 2016, 2026)).toEqual([2016, 2015, 2014]);
    expect(aniosDelModelo(2024, null, 2026)).toEqual([2027, 2026, 2025, 2024]);
  });
});

describe("nombreVehiculo", () => {
  it("usa el catálogo o los datos libres", () => {
    expect(nombreVehiculo({ marca: "Ford", modelo: "Ka" })).toBe("Ford Ka");
    expect(nombreVehiculo({ marcaLibre: "Peugeot", modeloLibre: "208" })).toBe("Peugeot 208");
  });
});

describe("formatearIntervalo", () => {
  it("km y meses, lo que ocurra primero", () => {
    expect(formatearIntervalo(15000, 12)).toBe("cada 15.000 km o 12 meses");
    expect(formatearIntervalo(90000, null)).toBe("cada 90.000 km");
  });
});
```

Run: `npm test` → FAIL, `Cannot find package '@/dominio/vehiculo'`.

- [ ] **Step 2: Implementar**

`src/dominio/vehiculo.ts`:

```ts
import { z } from "zod";
import { erroresDe, type ErroresCampo } from "./cuenta";
import { formatearKm, type ResultadoValidacion } from "./kilometraje";

export type DatosVehiculo =
  | { tipo: "catalogo"; modeloId: number; anio: number }
  | { tipo: "libre"; marca: string; modelo: string; anio: number };

/** Entero escrito en un formulario: admite punto de miles; vacío no es 0. */
function entero(mensaje: string, min: number, max: number) {
  return z.preprocess(
    (v) => (typeof v === "string" ? (v.trim() === "" ? undefined : Number(v.trim().replace(/\./g, ""))) : v),
    z.number({ error: mensaje }).int({ error: mensaje }).min(min, { error: mensaje }).max(max, { error: mensaje }),
  );
}

const anioMaximo = () => new Date().getFullYear() + 1;
const kilometraje = entero("Ingresá un kilometraje válido.", 0, 2_000_000);

const catalogo = z.object({
  tipo: z.literal("catalogo"),
  modeloId: entero("Elegí un modelo.", 1, 2_147_483_647),
  anio: entero("Elegí el año.", 1900, anioMaximo()),
});

const libre = z.object({
  tipo: z.literal("libre"),
  marca: z.string().trim().min(1, { error: "Ingresá la marca." }).max(60, { error: "Máximo 60 caracteres." }),
  modelo: z.string().trim().min(1, { error: "Ingresá el modelo." }).max(80, { error: "Máximo 80 caracteres." }),
  anio: entero("Ingresá un año válido.", 1900, anioMaximo()),
});

export function parsearVehiculo(
  entrada: Record<string, unknown>,
  conKilometraje: boolean,
): { ok: true; datos: DatosVehiculo; kilometraje: number | null } | { ok: false; errores: ErroresCampo } {
  // Cuatro ramas explícitas: .extend() no se puede llamar sobre una unión de esquemas.
  const esquema =
    entrada.tipo === "libre"
      ? conKilometraje ? libre.extend({ kilometraje }) : libre
      : conKilometraje ? catalogo.extend({ kilometraje }) : catalogo;
  const r = (esquema as z.ZodType<DatosVehiculo & { kilometraje?: number }>).safeParse(entrada);
  if (!r.success) return { ok: false, errores: erroresDe(r.error) };
  const { kilometraje: km, ...datos } = r.data;
  return { ok: true, datos, kilometraje: conKilometraje ? (km ?? null) : null };
}

/** CU-05 4a: el año tiene que estar dentro del rango del modelo. */
export function validarAnioDelModelo(anio: number, desde: number, hasta: number | null): ResultadoValidacion {
  if (anio >= desde && (hasta === null || anio <= hasta)) return { ok: true };
  return {
    ok: false,
    mensaje: hasta === null ? `Este modelo está cargado desde ${desde}.` : `Este modelo está cargado de ${desde} a ${hasta}.`,
  };
}

/** Años elegibles, del más nuevo al más viejo. Sin año final, hasta el año siguiente al actual. */
export function aniosDelModelo(desde: number, hasta: number | null, actual: number): number[] {
  const tope = hasta ?? actual + 1;
  return Array.from({ length: tope - desde + 1 }, (_, i) => tope - i);
}

export function nombreVehiculo(v: {
  marca?: string | null;
  modelo?: string | null;
  marcaLibre?: string | null;
  modeloLibre?: string | null;
}): string {
  return `${v.marca ?? v.marcaLibre ?? ""} ${v.modelo ?? v.modeloLibre ?? ""}`.trim();
}

/** "cada 15.000 km o 12 meses": el que ocurra primero. */
export function formatearIntervalo(km: number, meses: number | null): string {
  return meses ? `cada ${formatearKm(km)} km o ${meses} meses` : `cada ${formatearKm(km)} km`;
}
```

Run: `npm test` → PASS.

- [ ] **Step 3: Commit**

```bash
git add src/dominio/vehiculo.ts tests/unit/vehiculo.test.ts
git commit -m "feat: reglas del vehículo (RF-05, RF-06): parseo, rango de años y formatos" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Acceso a datos de vehículos

**Files:**
- Create: `src/datos/vehiculos.ts`, `tests/integracion/vehiculos.test.ts`

**Interfaces:**
- Consumes: `conUsuario`, `ClaimsUsuario`; `DatosVehiculo`, `validarAnioDelModelo`, `validarNuevaLectura`, `fechaDeHoy`, `nombreVehiculo`; `ErroresCampo`.
- Produces (en `@/datos/vehiculos`):
  - `type ModeloCatalogo = { id: number; nombre: string; anioDesde: number; anioHasta: number | null }`
  - `type MarcaCatalogo = { id: number; nombre: string; modelos: ModeloCatalogo[] }`
  - `type VehiculoResumen = { id: string; nombre: string; anio: number; kilometraje: number | null; fechaLectura: Date | null; catalogado: boolean }`
  - `type ItemPlan = { nombre: string; tipo: "reemplazo" | "inspeccion"; km: number; meses: number | null }`
  - `type VehiculoDetalle = VehiculoResumen & { datos: DatosVehiculo; marcaId: number | null; plan: { version: number; items: ItemPlan[] } | null }`
  - `type Resultado<T> = { ok: true; valor: T } | { ok: false; errores: ErroresCampo }`
  - `catalogoPublicado(claims): Promise<MarcaCatalogo[]>`
  - `listarVehiculos(claims): Promise<VehiculoResumen[]>`
  - `obtenerVehiculo(claims, id: string): Promise<VehiculoDetalle | null>`
  - `crearVehiculo(claims, datos: DatosVehiculo, kilometraje: number): Promise<Resultado<string>>`
  - `actualizarVehiculo(claims, id: string, datos: DatosVehiculo): Promise<Resultado<null>>`
  - `eliminarVehiculo(claims, id: string): Promise<boolean>`
  - `registrarLectura(claims, id: string, kilometraje: number): Promise<Resultado<null>>`

- [ ] **Step 1: Pruebas de integración que fallan**

`tests/integracion/vehiculos.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  actualizarVehiculo,
  catalogoPublicado,
  crearVehiculo,
  eliminarVehiculo,
  listarVehiculos,
  obtenerVehiculo,
  registrarLectura,
} from "@/datos/vehiculos";
import { prismaPrivilegiado as db } from "@/datos/privilegiado";
import { sembrar } from "../../prisma/seed";
import { borrarUsuarioPrueba, claimsDe, crearUsuarioPrueba } from "./ayudantes";

let a: string;
let b: string;
let kaId: number;

beforeAll(async () => {
  await sembrar();
  kaId = (await db.modelo.findFirstOrThrow({ where: { nombre: "Ka", marca: { nombre: "Ford" } } })).id;
  a = await crearUsuarioPrueba("veh-a");
  b = await crearUsuarioPrueba("veh-b");
});

afterAll(async () => {
  await borrarUsuarioPrueba(a);
  await borrarUsuarioPrueba(b);
});

describe("catálogo publicado (CU-05 paso 2)", () => {
  it("incluye el Ford Ka con su rango de años", async () => {
    const marcas = await catalogoPublicado(claimsDe(a));
    const ford = marcas.find((m) => m.nombre === "Ford");
    expect(ford?.modelos).toContainEqual({ id: kaId, nombre: "Ka", anioDesde: 2014, anioHasta: 2014 });
  });
});

describe("alta (CU-05)", () => {
  it("registra un Ford Ka con su primera lectura", async () => {
    const r = await crearVehiculo(claimsDe(a), { tipo: "catalogo", modeloId: kaId, anio: 2014 }, 62400);
    expect(r.ok).toBe(true);
    const lista = await listarVehiculos(claimsDe(a));
    expect(lista).toHaveLength(1);
    expect(lista[0]).toMatchObject({ nombre: "Ford Ka", anio: 2014, kilometraje: 62400, catalogado: true });
  });

  it("rechaza un año fuera del rango del modelo (4a)", async () => {
    const r = await crearVehiculo(claimsDe(a), { tipo: "catalogo", modeloId: kaId, anio: 2010 }, 1000);
    expect(r).toEqual({ ok: false, errores: { anio: "Este modelo está cargado de 2014 a 2014." } });
  });

  it("rechaza un modelo que no existe o no tiene plan publicado", async () => {
    const r = await crearVehiculo(claimsDe(a), { tipo: "catalogo", modeloId: 999999, anio: 2014 }, 1000);
    expect(r).toEqual({ ok: false, errores: { modeloId: "Elegí un modelo de la lista." } });
  });

  it("registra un modelo libre (3a) sin plan", async () => {
    const r = await crearVehiculo(claimsDe(a), { tipo: "libre", marca: "Peugeot", modelo: "208", anio: 2019 }, 41000);
    expect(r.ok).toBe(true);
    const detalle = await obtenerVehiculo(claimsDe(a), r.ok ? r.valor : "");
    expect(detalle).toMatchObject({ nombre: "Peugeot 208", catalogado: false, plan: null });
  });
});

describe("ficha", () => {
  it("trae el plan publicado del modelo con sus 8 ítems", async () => {
    const [ka] = (await listarVehiculos(claimsDe(a))).filter((v) => v.catalogado);
    const detalle = await obtenerVehiculo(claimsDe(a), ka!.id);
    expect(detalle?.plan?.items).toHaveLength(8);
    expect(detalle?.plan?.items).toContainEqual({ nombre: "Aceite y filtro de aceite", tipo: "reemplazo", km: 15000, meses: 12 });
  });

  it("un id que no es un uuid devuelve null en lugar de fallar", async () => {
    expect(await obtenerVehiculo(claimsDe(a), "no-es-un-uuid")).toBeNull();
  });
});

describe("kilometraje (CU-08, RF-07)", () => {
  it("rechaza una lectura menor indicando el mínimo", async () => {
    const [ka] = (await listarVehiculos(claimsDe(a))).filter((v) => v.catalogado);
    const r = await registrarLectura(claimsDe(a), ka!.id, 61900);
    expect(r).toEqual({ ok: false, errores: { kilometraje: "No puede ser menor a 62.400 km, la última lectura." } });
  });

  it("acepta una lectura mayor y pasa a ser la última", async () => {
    const [ka] = (await listarVehiculos(claimsDe(a))).filter((v) => v.catalogado);
    expect((await registrarLectura(claimsDe(a), ka!.id, 63000)).ok).toBe(true);
    const [actual] = (await listarVehiculos(claimsDe(a))).filter((v) => v.catalogado);
    expect(actual?.kilometraje).toBe(63000);
  });

  it("dos lecturas simultáneas no dejan el odómetro hacia atrás", async () => {
    const [ka] = (await listarVehiculos(claimsDe(a))).filter((v) => v.catalogado);
    await Promise.all([registrarLectura(claimsDe(a), ka!.id, 64000), registrarLectura(claimsDe(a), ka!.id, 63500)]);
    const lecturas = await db.lecturaKilometraje.findMany({ where: { vehiculoId: ka!.id }, orderBy: { id: "asc" } });
    const kms = lecturas.map((l) => l.kilometraje);
    expect(kms).toEqual([...kms].sort((x, y) => x - y));
  });
});

describe("edición y baja (CU-07)", () => {
  it("pasar a modelo libre deja de asociar el plan", async () => {
    const libre = (await listarVehiculos(claimsDe(a))).find((v) => !v.catalogado)!;
    const r = await actualizarVehiculo(claimsDe(a), libre.id, { tipo: "libre", marca: "Peugeot", modelo: "208 GT", anio: 2020 });
    expect(r.ok).toBe(true);
    expect((await obtenerVehiculo(claimsDe(a), libre.id))?.nombre).toBe("Peugeot 208 GT");
  });

  it("eliminar borra el vehículo y sus lecturas (cascada)", async () => {
    const libre = (await listarVehiculos(claimsDe(a))).find((v) => !v.catalogado)!;
    expect(await eliminarVehiculo(claimsDe(a), libre.id)).toBe(true);
    expect(await db.lecturaKilometraje.count({ where: { vehiculoId: libre.id } })).toBe(0);
  });
});

describe("aislamiento entre usuarios (RNF-04)", () => {
  it("otro usuario no ve, edita, actualiza ni elimina el vehículo", async () => {
    const [ka] = await listarVehiculos(claimsDe(a));
    expect(await listarVehiculos(claimsDe(b))).toEqual([]);
    expect(await obtenerVehiculo(claimsDe(b), ka!.id)).toBeNull();
    expect((await actualizarVehiculo(claimsDe(b), ka!.id, { tipo: "libre", marca: "X", modelo: "Y", anio: 2000 })).ok).toBe(false);
    expect((await registrarLectura(claimsDe(b), ka!.id, 999999)).ok).toBe(false);
    expect(await eliminarVehiculo(claimsDe(b), ka!.id)).toBe(false);
    expect((await obtenerVehiculo(claimsDe(a), ka!.id))?.kilometraje).not.toBe(999999);
  });
});
```

Run: `npm run test:integracion` → FAIL, `Cannot find package '@/datos/vehiculos'`.

- [ ] **Step 2: Implementar**

`src/datos/vehiculos.ts`:

```ts
import type { ErroresCampo } from "@/dominio/cuenta";
import { fechaDeHoy } from "@/dominio/fechas";
import { validarNuevaLectura } from "@/dominio/kilometraje";
import { nombreVehiculo, validarAnioDelModelo, type DatosVehiculo } from "@/dominio/vehiculo";
import { conUsuario, type ClaimsUsuario, type TxUsuario } from "./cliente-usuario";

export type ModeloCatalogo = { id: number; nombre: string; anioDesde: number; anioHasta: number | null };
export type MarcaCatalogo = { id: number; nombre: string; modelos: ModeloCatalogo[] };
export type VehiculoResumen = {
  id: string;
  nombre: string;
  anio: number;
  kilometraje: number | null;
  fechaLectura: Date | null;
  catalogado: boolean;
};
export type ItemPlan = { nombre: string; tipo: "reemplazo" | "inspeccion"; km: number; meses: number | null };
export type VehiculoDetalle = VehiculoResumen & {
  datos: DatosVehiculo;
  marcaId: number | null;
  plan: { version: number; items: ItemPlan[] } | null;
};
export type Resultado<T> = { ok: true; valor: T } | { ok: false; errores: ErroresCampo };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NO_ENCONTRADO: Resultado<never> = { ok: false, errores: { formulario: "No encontramos el vehículo." } };
const CON_PLAN = { planes: { some: { estado: "publicado" as const } } };
const INCLUIR = {
  modelo: { include: { marca: true } },
  lecturas: { orderBy: { kilometraje: "desc" as const }, take: 1 },
};

type FilaVehiculo = Awaited<ReturnType<typeof buscarVehiculos>>[number];
function buscarVehiculos(tx: TxUsuario, id?: string) {
  return tx.vehiculo.findMany({ where: id ? { id } : {}, include: INCLUIR, orderBy: { fechaAlta: "asc" } });
}

function resumen(v: FilaVehiculo): VehiculoResumen {
  const ultima = v.lecturas[0];
  return {
    id: v.id,
    nombre: nombreVehiculo({ marca: v.modelo?.marca.nombre, modelo: v.modelo?.nombre, marcaLibre: v.marcaLibre, modeloLibre: v.modeloLibre }),
    anio: v.anio,
    kilometraje: ultima?.kilometraje ?? null,
    fechaLectura: ultima?.fecha ?? null,
    catalogado: v.modeloId !== null,
  };
}

/** CU-05 paso 2: marcas y modelos con plan publicado. */
export async function catalogoPublicado(claims: ClaimsUsuario): Promise<MarcaCatalogo[]> {
  return conUsuario(claims, async (tx) => {
    const marcas = await tx.marca.findMany({
      where: { modelos: { some: CON_PLAN } },
      orderBy: { nombre: "asc" },
      include: {
        modelos: {
          where: CON_PLAN,
          orderBy: { nombre: "asc" },
          select: { id: true, nombre: true, anioDesde: true, anioHasta: true },
        },
      },
    });
    return marcas.map((m) => ({ id: m.id, nombre: m.nombre, modelos: m.modelos }));
  });
}

export async function listarVehiculos(claims: ClaimsUsuario): Promise<VehiculoResumen[]> {
  return conUsuario(claims, async (tx) => (await buscarVehiculos(tx)).map(resumen));
}

export async function obtenerVehiculo(claims: ClaimsUsuario, id: string): Promise<VehiculoDetalle | null> {
  if (!UUID.test(id)) return null;
  return conUsuario(claims, async (tx) => {
    const [v] = await buscarVehiculos(tx, id);
    if (!v) return null;
    const plan = v.modeloId
      ? await tx.planMantenimiento.findFirst({
          where: { modeloId: v.modeloId, estado: "publicado" },
          include: { intervalos: { include: { item: true }, orderBy: { intervaloKm: "asc" } } },
        })
      : null;
    const datos: DatosVehiculo = v.modeloId
      ? { tipo: "catalogo", modeloId: v.modeloId, anio: v.anio }
      : { tipo: "libre", marca: v.marcaLibre ?? "", modelo: v.modeloLibre ?? "", anio: v.anio };
    return {
      ...resumen(v),
      datos,
      marcaId: v.modelo?.marcaId ?? null,
      plan: plan && {
        version: plan.version,
        items: plan.intervalos.map((i) => ({ nombre: i.item.nombre, tipo: i.item.tipo, km: i.intervaloKm, meses: i.intervaloMeses })),
      },
    };
  });
}

/** Verifica el modelo del catálogo (que tenga plan publicado) y el rango de años. */
async function validarCatalogo(tx: TxUsuario, datos: DatosVehiculo): Promise<ErroresCampo | null> {
  if (datos.tipo !== "catalogo") return null;
  const modelo = await tx.modelo.findFirst({ where: { id: datos.modeloId, ...CON_PLAN } });
  if (!modelo) return { modeloId: "Elegí un modelo de la lista." };
  const r = validarAnioDelModelo(datos.anio, modelo.anioDesde, modelo.anioHasta);
  return r.ok ? null : { anio: r.mensaje };
}

function columnas(datos: DatosVehiculo) {
  return datos.tipo === "catalogo"
    ? { modeloId: datos.modeloId, marcaLibre: null, modeloLibre: null, anio: datos.anio }
    : { modeloId: null, marcaLibre: datos.marca, modeloLibre: datos.modelo, anio: datos.anio };
}

/** CU-05 pasos 4–5: valida y registra el vehículo con su primera lectura. */
export async function crearVehiculo(claims: ClaimsUsuario, datos: DatosVehiculo, kilometraje: number): Promise<Resultado<string>> {
  return conUsuario(claims, async (tx) => {
    const errores = await validarCatalogo(tx, datos);
    if (errores) return { ok: false, errores };
    const v = await tx.vehiculo.create({
      data: { usuarioId: claims.sub, ...columnas(datos), lecturas: { create: { kilometraje, fecha: fechaDeHoy() } } },
    });
    return { ok: true, valor: v.id };
  });
}

/** CU-07 pasos 3–4. El kilometraje no se edita acá: se actualiza con CU-08. */
export async function actualizarVehiculo(claims: ClaimsUsuario, id: string, datos: DatosVehiculo): Promise<Resultado<null>> {
  if (!UUID.test(id)) return NO_ENCONTRADO;
  return conUsuario(claims, async (tx) => {
    if (!(await tx.vehiculo.findUnique({ where: { id }, select: { id: true } }))) return NO_ENCONTRADO;
    const errores = await validarCatalogo(tx, datos);
    if (errores) return { ok: false, errores };
    await tx.vehiculo.update({ where: { id }, data: columnas(datos) });
    return { ok: true, valor: null };
  });
}

/** CU-07 1a: la cascada borra lecturas, intervenciones y comprobantes. */
export async function eliminarVehiculo(claims: ClaimsUsuario, id: string): Promise<boolean> {
  if (!UUID.test(id)) return false;
  return conUsuario(claims, async (tx) => (await tx.vehiculo.deleteMany({ where: { id } })).count === 1);
}

/**
 * CU-08 (RF-07): bloquea la fila del vehículo para que dos cargas simultáneas no salteen la regla,
 * valida contra la última lectura y guarda la nueva con la fecha del día.
 */
export async function registrarLectura(claims: ClaimsUsuario, id: string, kilometraje: number): Promise<Resultado<null>> {
  if (!UUID.test(id)) return NO_ENCONTRADO;
  return conUsuario(claims, async (tx) => {
    const bloqueado = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM public.vehiculo WHERE id = ${id}::uuid FOR UPDATE`;
    if (bloqueado.length === 0) return NO_ENCONTRADO;
    const ultima = await tx.lecturaKilometraje.findFirst({ where: { vehiculoId: id }, orderBy: { kilometraje: "desc" } });
    const r = validarNuevaLectura(ultima?.kilometraje ?? null, kilometraje);
    if (!r.ok) return { ok: false, errores: { kilometraje: r.mensaje } };
    await tx.lecturaKilometraje.create({ data: { vehiculoId: id, kilometraje, fecha: fechaDeHoy() } });
    return { ok: true, valor: null };
  });
}
```

Run: `npm run test:integracion` → PASS, 37 pruebas (24 + 13).

- [ ] **Step 3: Commit**

```bash
git add src/datos/vehiculos.ts tests/integracion/vehiculos.test.ts
git commit -m "feat: datos de vehículos con RLS y bloqueo de fila al actualizar el kilometraje (RF-05 a RF-07)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Acciones y formulario de alta y edición

**Files:**
- Create: `src/components/selector.tsx`, `src/app/(propietario)/vehiculos/acciones.ts`, `src/app/(propietario)/vehiculos/formulario.tsx`, `src/app/(propietario)/vehiculos/nuevo/page.tsx`

**Interfaces:**
- Consumes: datos de la Task 3; `parsearVehiculo`, `aniosDelModelo`; `Campo`, `Aviso`, `Button`.
- Produces:
  - `<Selector id etiqueta nombre opciones={{ valor, texto }[]} valor onCambio? ayuda? error? vacio? />`
  - Acciones: `type EstadoVehiculo = { errores?: ErroresCampo }`; `agregarVehiculo(previo, datos)`, `editarVehiculo(id, previo, datos)`, `borrarVehiculo(id)`, `actualizarKilometraje(id, previo, datos)` (esta devuelve `{ errores?, ok?: true }`).
  - `<FormularioVehiculo catalogo accion inicial? conKilometraje textoBoton />`

- [ ] **Step 1: Selector**

`src/components/selector.tsx`:

```tsx
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Props = {
  id: string;
  etiqueta: string;
  nombre: string;
  opciones: { valor: string; texto: string }[];
  valor: string;
  onCambio?: (valor: string) => void;
  ayuda?: string;
  error?: string;
  vacio?: string;
};

/** <select> nativo (mejor en el celular) con el mismo estilo que Campo. */
export function Selector({ id, etiqueta, nombre, opciones, valor, onCambio, ayuda, error, vacio = "Elegí una opción" }: Props) {
  const idAyuda = `${id}-ayuda`;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-medium">
        {etiqueta}
      </Label>
      <select
        id={id}
        name={nombre}
        value={valor}
        onChange={(e) => onCambio?.(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || ayuda ? idAyuda : undefined}
        className={cn(
          "h-12 w-full rounded-md border border-input bg-card px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
          error && "border-destructive",
        )}
      >
        <option value="">{vacio}</option>
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.texto}
          </option>
        ))}
      </select>
      {error ? (
        <p id={idAyuda} className="text-[13px] text-destructive">{error}</p>
      ) : (
        ayuda && <p id={idAyuda} className="text-[13px] text-muted-foreground">{ayuda}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Acciones**

`src/app/(propietario)/vehiculos/acciones.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { exigirClaims } from "@/datos/sesion";
import { actualizarVehiculo, crearVehiculo, eliminarVehiculo, registrarLectura } from "@/datos/vehiculos";
import type { ErroresCampo } from "@/dominio/cuenta";
import { parsearVehiculo } from "@/dominio/vehiculo";

export type EstadoVehiculo = { errores?: ErroresCampo; ok?: true };

/** CU-05. */
export async function agregarVehiculo(_previo: EstadoVehiculo, datos: FormData): Promise<EstadoVehiculo> {
  const claims = await exigirClaims();
  const p = parsearVehiculo(Object.fromEntries(datos), true);
  if (!p.ok) return { errores: p.errores };
  const r = await crearVehiculo(claims, p.datos, p.kilometraje!);
  if (!r.ok) return { errores: r.errores };
  revalidatePath("/vehiculos");
  redirect(`/vehiculos/${r.valor}`);
}

/** CU-07. */
export async function editarVehiculo(id: string, _previo: EstadoVehiculo, datos: FormData): Promise<EstadoVehiculo> {
  const claims = await exigirClaims();
  const p = parsearVehiculo(Object.fromEntries(datos), false);
  if (!p.ok) return { errores: p.errores };
  const r = await actualizarVehiculo(claims, id, p.datos);
  if (!r.ok) return { errores: r.errores };
  revalidatePath("/vehiculos");
  redirect(`/vehiculos/${id}`);
}

/** CU-07 1a. */
export async function borrarVehiculo(id: string): Promise<void> {
  const claims = await exigirClaims();
  await eliminarVehiculo(claims, id);
  revalidatePath("/vehiculos");
  redirect("/vehiculos");
}

/** CU-08. */
export async function actualizarKilometraje(id: string, _previo: EstadoVehiculo, datos: FormData): Promise<EstadoVehiculo> {
  const claims = await exigirClaims();
  const texto = String(datos.get("kilometraje") ?? "").trim().replace(/\./g, "");
  const km = texto === "" ? Number.NaN : Number(texto);
  const r = await registrarLectura(claims, id, km);
  if (!r.ok) return { errores: r.errores };
  revalidatePath(`/vehiculos/${id}`);
  revalidatePath("/vehiculos");
  return { ok: true };
}
```

Nota: `registrarLectura` recibe `NaN` cuando el campo está vacío y `validarNuevaLectura` lo rechaza con "Ingresá un kilometraje válido." (no es entero).

- [ ] **Step 3: Formulario**

`src/app/(propietario)/vehiculos/formulario.tsx`:

```tsx
"use client";

import { useActionState, useState } from "react";
import { Aviso } from "@/components/aviso";
import { Campo } from "@/components/campo";
import { Selector } from "@/components/selector";
import { Button } from "@/components/ui/button";
import type { MarcaCatalogo } from "@/datos/vehiculos";
import { aniosDelModelo, type DatosVehiculo } from "@/dominio/vehiculo";
import type { EstadoVehiculo } from "./acciones";

type Props = {
  catalogo: MarcaCatalogo[];
  accion: (previo: EstadoVehiculo, datos: FormData) => Promise<EstadoVehiculo>;
  inicial?: { datos: DatosVehiculo; marcaId: number | null };
  conKilometraje: boolean;
  textoBoton: string;
};

/** CU-05 (alta) y CU-07 (edición): catálogo o modelo libre (3a). */
export function FormularioVehiculo({ catalogo, accion, inicial, conKilometraje, textoBoton }: Props) {
  const [estado, enviar, enviando] = useActionState(accion, {});
  const [modo, setModo] = useState<"catalogo" | "libre">(inicial?.datos.tipo ?? "catalogo");
  const [marcaId, setMarcaId] = useState(inicial?.marcaId ? String(inicial.marcaId) : "");
  const [modeloId, setModeloId] = useState(inicial?.datos.tipo === "catalogo" ? String(inicial.datos.modeloId) : "");
  const [anio, setAnio] = useState(inicial?.datos.tipo === "catalogo" ? String(inicial.datos.anio) : "");

  const marca = catalogo.find((m) => String(m.id) === marcaId);
  const modelo = marca?.modelos.find((m) => String(m.id) === modeloId);
  const anios = modelo ? aniosDelModelo(modelo.anioDesde, modelo.anioHasta, new Date().getFullYear()) : [];
  const rango = modelo && (modelo.anioHasta ? `de ${modelo.anioDesde} a ${modelo.anioHasta}` : `desde ${modelo.anioDesde}`);
  const libreInicial = inicial?.datos.tipo === "libre" ? inicial.datos : null;
  const e = estado.errores ?? {};

  return (
    <form action={enviar} className="space-y-4" noValidate>
      <input type="hidden" name="tipo" value={modo} />
      {e.formulario && <Aviso tipo="error">{e.formulario}</Aviso>}

      {modo === "catalogo" ? (
        <>
          <Selector
            id="marca"
            etiqueta="Marca"
            nombre="marcaId"
            valor={marcaId}
            onCambio={(v) => {
              setMarcaId(v);
              setModeloId("");
              setAnio("");
            }}
            opciones={catalogo.map((m) => ({ valor: String(m.id), texto: m.nombre }))}
            vacio="Elegí la marca"
          />
          <Selector
            id="modelo"
            etiqueta="Modelo"
            nombre="modeloId"
            valor={modeloId}
            onCambio={(v) => {
              setModeloId(v);
              setAnio("");
            }}
            opciones={(marca?.modelos ?? []).map((m) => ({ valor: String(m.id), texto: m.nombre }))}
            vacio={marca ? "Elegí el modelo" : "Primero elegí la marca"}
            error={e.modeloId}
          />
          <Selector
            id="anio"
            etiqueta="Año"
            nombre="anio"
            valor={anio}
            onCambio={setAnio}
            opciones={anios.map((a) => ({ valor: String(a), texto: String(a) }))}
            vacio={modelo ? "Elegí el año" : "Primero elegí el modelo"}
            ayuda={rango ? `Este modelo está cargado ${rango}.` : undefined}
            error={e.anio}
          />
          <button type="button" onClick={() => setModo("libre")} className="text-sm text-primary underline underline-offset-4">
            Mi modelo no figura en la lista
          </button>
        </>
      ) : (
        <>
          <Aviso tipo="advertencia">
            Vamos a guardar tu vehículo, pero todavía no tenemos el plan de mantenimiento de este modelo. Vas a poder
            registrar los trabajos que le hagas.
          </Aviso>
          <Campo id="marca-libre" etiqueta="Marca" nombre="marca" valorInicial={libreInicial?.marca} error={e.marca} />
          <Campo id="modelo-libre" etiqueta="Modelo" nombre="modelo" valorInicial={libreInicial?.modelo} error={e.modelo} />
          <Campo id="anio-libre" etiqueta="Año" nombre="anio" inputMode="numeric" valorInicial={libreInicial ? String(libreInicial.anio) : undefined} error={e.anio} />
          {catalogo.length > 0 && (
            <button type="button" onClick={() => setModo("catalogo")} className="text-sm text-primary underline underline-offset-4">
              Elegir un modelo de la lista
            </button>
          )}
        </>
      )}

      {conKilometraje && (
        <Campo id="kilometraje" etiqueta="Kilometraje actual" nombre="kilometraje" inputMode="numeric" sufijo="km" error={e.kilometraje} />
      )}

      <Button type="submit" className="h-12 w-full" disabled={enviando}>
        {textoBoton}
      </Button>
    </form>
  );
}
```

- [ ] **Step 4: Página de alta**

`src/app/(propietario)/vehiculos/nuevo/page.tsx`:

```tsx
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { exigirClaims } from "@/datos/sesion";
import { catalogoPublicado } from "@/datos/vehiculos";
import { agregarVehiculo } from "../acciones";
import { FormularioVehiculo } from "../formulario";

export const metadata: Metadata = { title: "Agregar vehículo · Libreta de service" };

export default async function NuevoVehiculoPagina() {
  const claims = await exigirClaims();
  const catalogo = await catalogoPublicado(claims);
  return (
    <section>
      <Link href="/vehiculos" className="mb-4 inline-flex items-center gap-1 text-sm">
        <ArrowLeft className="size-4" aria-hidden="true" /> Volver
      </Link>
      <h1 className="mb-6 text-[22px] font-semibold">Agregar vehículo</h1>
      <FormularioVehiculo catalogo={catalogo} accion={agregarVehiculo} conKilometraje textoBoton="Agregar vehículo" />
    </section>
  );
}
```

- [ ] **Step 5: Verificar y commit**

```bash
npm run typecheck && npm run lint && npm run build
git add -A
git commit -m "feat: agregar vehículo del catálogo o de un modelo libre (CU-05)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Lista, ficha, kilometraje, edición y baja

**Files:**
- Modify: `src/app/(propietario)/vehiculos/page.tsx`
- Create: `src/app/(propietario)/vehiculos/[id]/page.tsx`, `[id]/kilometraje.tsx`, `[id]/eliminar.tsx`, `[id]/editar/page.tsx`

**Interfaces:**
- Consumes: `listarVehiculos`, `obtenerVehiculo`, `catalogoPublicado`; acciones de la Task 4; `formatearKm`, `formatearFecha`, `formatearIntervalo`.

- [ ] **Step 1: Mis vehículos**

`src/app/(propietario)/vehiculos/page.tsx`:

```tsx
import { ChevronRight, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { exigirClaims } from "@/datos/sesion";
import { listarVehiculos } from "@/datos/vehiculos";
import { formatearKm } from "@/dominio/kilometraje";

export const metadata: Metadata = { title: "Mis vehículos · Libreta de service" };

export default async function VehiculosPagina() {
  const claims = await exigirClaims();
  const vehiculos = await listarVehiculos(claims);

  return (
    <section>
      <h1 className="text-[22px] font-semibold">Mis vehículos</h1>
      {vehiculos.length === 0 ? (
        <>
          <p className="mt-6">Todavía no cargaste ningún vehículo.</p>
          <p className="mt-1 text-sm text-muted-foreground">Cargá tu auto y te decimos qué mantenimiento le toca.</p>
        </>
      ) : (
        <ul className="mt-6 space-y-3">
          {vehiculos.map((v) => (
            <li key={v.id}>
              <Link href={`/vehiculos/${v.id}`} className="flex items-center justify-between rounded-[14px] border border-border bg-card p-4">
                <span>
                  <span className="block text-[17px] font-semibold">{v.nombre}</span>
                  <span className="block text-sm text-muted-foreground">{v.anio}</span>
                </span>
                <span className="flex items-center gap-2">
                  {v.kilometraje !== null && <span className="text-sm font-medium tabular-nums">{formatearKm(v.kilometraje)} km</span>}
                  <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Button asChild className="mt-6 h-12 w-full">
        <Link href="/vehiculos/nuevo">
          <Plus className="size-4" aria-hidden="true" /> Agregar vehículo
        </Link>
      </Button>
    </section>
  );
}
```

- [ ] **Step 2: Diálogos de la ficha**

`src/app/(propietario)/vehiculos/[id]/kilometraje.tsx`:

```tsx
"use client";

import { useActionState, useEffect, useState } from "react";
import { Campo } from "@/components/campo";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { actualizarKilometraje } from "../acciones";

/** CU-08: muestra la última lectura y registra la nueva. */
export function ActualizarKilometraje({ id, ultima }: { id: string; ultima: string }) {
  const [abierto, setAbierto] = useState(false);
  const [estado, enviar, enviando] = useActionState(actualizarKilometraje.bind(null, id), {});

  useEffect(() => {
    if (estado.ok) setAbierto(false);
  }, [estado]);

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-12 w-full">
          Actualizar kilometraje
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100%-2rem)] rounded-[14px] sm:max-w-md">
        <DialogHeader className="text-left">
          <DialogTitle>Actualizar kilometraje</DialogTitle>
          <DialogDescription>Última lectura: {ultima}.</DialogDescription>
        </DialogHeader>
        <form action={enviar} className="space-y-4">
          <Campo id="kilometraje" etiqueta="Kilometraje actual" nombre="kilometraje" inputMode="numeric" sufijo="km" error={estado.errores?.kilometraje ?? estado.errores?.formulario} />
          <Button type="submit" className="h-12 w-full" disabled={enviando}>
            Guardar
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

`src/app/(propietario)/vehiculos/[id]/eliminar.tsx`:

```tsx
"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { borrarVehiculo } from "../acciones";

/** CU-07 1a. */
export function EliminarVehiculo({ id, nombre }: { id: string; nombre: string }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" className="h-12 w-full text-destructive">
          Eliminar vehículo
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100%-2rem)] rounded-[14px] sm:max-w-md">
        <DialogHeader className="text-left">
          <DialogTitle>¿Eliminar el {nombre}?</DialogTitle>
          <DialogDescription>Se van a borrar también sus lecturas de kilometraje y su historial. No se puede deshacer.</DialogDescription>
        </DialogHeader>
        <form action={borrarVehiculo.bind(null, id)}>
          <DialogFooter className="flex-row gap-2 sm:justify-stretch">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="h-12 flex-1">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" variant="destructive" className="h-12 flex-1">
              Eliminar vehículo
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Ficha**

`src/app/(propietario)/vehiculos/[id]/page.tsx`:

```tsx
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Aviso } from "@/components/aviso";
import { Button } from "@/components/ui/button";
import { exigirClaims } from "@/datos/sesion";
import { obtenerVehiculo } from "@/datos/vehiculos";
import { formatearFecha } from "@/dominio/fechas";
import { formatearKm } from "@/dominio/kilometraje";
import { formatearIntervalo } from "@/dominio/vehiculo";
import { EliminarVehiculo } from "./eliminar";
import { ActualizarKilometraje } from "./kilometraje";

export const metadata: Metadata = { title: "Ficha del vehículo · Libreta de service" };

export default async function FichaVehiculoPagina({ params }: PageProps<"/vehiculos/[id]">) {
  const { id } = await params;
  const claims = await exigirClaims();
  const v = await obtenerVehiculo(claims, id);
  if (!v) notFound();

  const km = v.kilometraje === null ? "sin lecturas" : `${formatearKm(v.kilometraje)} km`;
  const ultima = v.fechaLectura ? `${km}, el ${formatearFecha(v.fechaLectura)}` : km;

  return (
    <section>
      <Link href="/vehiculos" className="mb-4 inline-flex items-center gap-1 text-sm">
        <ArrowLeft className="size-4" aria-hidden="true" /> Volver
      </Link>
      <h1 className="text-[22px] font-semibold">
        {v.nombre} {v.anio}
      </h1>

      <div className="mt-6">
        <p className="text-sm text-muted-foreground">Kilometraje actual</p>
        <p className="text-[28px] font-semibold leading-tight tabular-nums">{km}</p>
        {v.fechaLectura && <p className="text-sm text-muted-foreground">Actualizado el {formatearFecha(v.fechaLectura)}</p>}
        <div className="mt-4">
          <ActualizarKilometraje id={v.id} ultima={ultima} />
        </div>
      </div>

      <h2 className="mt-8 text-[17px] font-semibold">Plan del fabricante</h2>
      {v.plan ? (
        <>
          <p className="mt-1 text-sm text-muted-foreground">Pronto vas a ver acá el estado de cada ítem: al día, próximo o vencido.</p>
          <ul className="mt-3 divide-y divide-border overflow-hidden rounded-[14px] border border-border bg-card">
            {v.plan.items.map((i) => (
              <li key={i.nombre} className="px-4 py-3">
                <p className="font-medium">{i.nombre}</p>
                <p className="text-sm text-muted-foreground tabular-nums">
                  {i.tipo === "reemplazo" ? "Cambiar" : "Revisar"} · {formatearIntervalo(i.km, i.meses)}
                </p>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className="mt-3">
          <Aviso tipo="advertencia">Todavía no tenemos el plan de mantenimiento de este modelo. Vas a poder registrar los trabajos que le hagas.</Aviso>
        </div>
      )}

      <div className="mt-8 space-y-2">
        <Button asChild variant="outline" className="h-12 w-full">
          <Link href={`/vehiculos/${v.id}/editar`}>Editar datos</Link>
        </Button>
        <EliminarVehiculo id={v.id} nombre={v.nombre} />
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Edición**

`src/app/(propietario)/vehiculos/[id]/editar/page.tsx`:

```tsx
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirClaims } from "@/datos/sesion";
import { catalogoPublicado, obtenerVehiculo } from "@/datos/vehiculos";
import { editarVehiculo } from "../../acciones";
import { FormularioVehiculo } from "../../formulario";

export const metadata: Metadata = { title: "Editar vehículo · Libreta de service" };

export default async function EditarVehiculoPagina({ params }: PageProps<"/vehiculos/[id]/editar">) {
  const { id } = await params;
  const claims = await exigirClaims();
  const [v, catalogo] = await Promise.all([obtenerVehiculo(claims, id), catalogoPublicado(claims)]);
  if (!v) notFound();

  return (
    <section>
      <Link href={`/vehiculos/${v.id}`} className="mb-4 inline-flex items-center gap-1 text-sm">
        <ArrowLeft className="size-4" aria-hidden="true" /> Volver
      </Link>
      <h1 className="text-[22px] font-semibold">Editar vehículo</h1>
      <p className="mb-6 mt-1 text-sm text-muted-foreground">El kilometraje se actualiza desde la ficha.</p>
      <FormularioVehiculo
        catalogo={catalogo}
        accion={editarVehiculo.bind(null, v.id)}
        inicial={{ datos: v.datos, marcaId: v.marcaId }}
        conKilometraje={false}
        textoBoton="Guardar cambios"
      />
    </section>
  );
}
```

- [ ] **Step 5: Verificar y commit**

```bash
npm test && npm run test:integracion && npm run typecheck && npm run lint && npm run build
git add -A
git commit -m "feat: lista, ficha, kilometraje, edición y baja de vehículos (CU-07, CU-08)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Verificación en el navegador, ajuste de la spec y pull request

- [ ] **Step 1 (agente): revisión visual a 360 px** con la vista previa, comparando con `mobile/04` a `07`: lista vacía y con vehículos, alta del catálogo y libre (con errores), ficha, diálogo de kilometraje con la lectura menor, edición, eliminación. Para entrar, Felipe ya tiene sesión en su Chrome; en la vista previa del agente se usa una cuenta de prueba creada con `crearUsuarioPrueba` y una sesión obtenida con `signInWithPassword` del lado del agente **solo si Felipe lo autoriza**; si no, la revisión visual la hace Felipe y manda capturas.

- [ ] **Step 2 (Felipe): recorrido real en su Chrome**: cargar un Ford Ka 2014 con 62.400 km; intentar actualizar a 61.900 (tiene que rechazarlo con el mínimo); actualizar a 63.000; editar el año (no hay otro año posible para el Ka: comprobar que el selector solo ofrece 2014); cargar un "Peugeot 208" libre; eliminarlo.

- [ ] **Step 3: Ajustar la spec** — en `docs/superpowers/specs/2026-10-05-iteracion-1-base-design.md`, apartado 6, fila "Mis vehículos", reemplazar "Con un solo vehículo, abre su ficha directamente" por "La lista se muestra siempre (*ajuste del plan 1C*: abrir la ficha directamente dejaba sin acceso a «Agregar vehículo»)".

- [ ] **Step 4: Commit, push (con confirmación de Felipe) y PR** — título "Iteración 1C: vehículos". Leer CI con `mcp__ccd_pr__get_status` y unir en verde.

## Criterio de terminado del plan 1C

1. `npm test` (36: 20 + 3 + 13), `npm run test:integracion` (37), `typecheck`, `lint` y `build` en verde.
2. Felipe completó el recorrido del Step 2 sin errores.
3. El resultado verificable de la Tabla 8 se cumple en la aplicación: cuenta creada y Ford Ka registrado.
4. CI en verde y PR unido a `main`.
