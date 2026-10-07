# Iteración 1D — Catálogo de mantenimiento: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el administrador de catálogo dé de alta y edite modelos, defina los ítems de su plan de mantenimiento y publique versiones del plan sin afectar a los propietarios hasta publicar (CU-15, CU-16, CU-17; RF-18 a RF-20).

**Architecture:** Reglas en `src/dominio/catalogo.ts`. Datos en `src/datos/catalogo.ts`, siempre con `conUsuario`: la seguridad la ponen las políticas `*_admin` de la migración (solo `administrador_catalogo` escribe). El panel vive en `/admin`, con un layout que exige el rol (`exigirRol`) además de RLS. Versionado: cada modelo tiene a lo sumo un borrador; editar un plan publicado crea primero la versión siguiente en borrador copiando sus intervalos; publicar marca la anterior como `reemplazado` y el borrador como `publicado` en una sola transacción.

**Tech Stack:** Next.js 16, React 19, Prisma 7 vía `conUsuario`, Zod 4, shadcn/ui, Vitest.

**Spec:** apartado 6 ("Administrador de catálogo") de `docs/superpowers/specs/2026-10-05-iteracion-1-base-design.md` · Fichas CU-15 a CU-17 (Tablas 23 a 25) · Diseño: `docs/diseno/pantallas/web/09` a `11`.

## Global Constraints

- Todo lo de los planes 1A a 1C sigue vigente.
- El panel es **de escritorio** (barra lateral de 240 px, contenido de hasta 1120 px, tablas con filas separadas por línea), pero tiene que poder usarse en un celular sin desplazamiento horizontal de la página (las tablas pueden desplazarse dentro de su caja).
- Un ítem pertenece a un modelo (`ITEM_MANTENIMIENTO.modelo_id`) y se comparte entre versiones del plan; el historial de los propietarios lo referencia. Por eso **el nombre y el tipo de un ítem no se editan**: se quita y se agrega otro. Lo que se edita por versión son los intervalos (`INTERVALO_PLAN`).
- Publicar no recalcula nada: los propietarios ven la versión nueva en su próxima consulta (CU-17, postcondición).

## Ajustes respecto del diseño

- **Mockup 09, columna "Última modificación":** el modelo de datos no guarda fechas de modificación (Figura 7). Se reemplaza por "Publicado el", que sale de `PLAN_MANTENIMIENTO.fecha_publicacion`.
- **Mockup 10, "Crear la marca":** la marca se escribe en un campo con sugerencias (`<datalist>`) de las existentes; si no existe, se crea al guardar.
- **"Descartar borrador"** solo aparece si hay una versión publicada: un modelo nuevo no tiene a qué volver.

## Mapa de archivos

| Archivo | Responsabilidad |
|---|---|
| `src/dominio/catalogo.ts` | Esquemas de modelo, ítem e intervalo; `rangosSeSuperponen`; `validarPublicacion` |
| `src/datos/sesion.ts` | `exigirRol(rol)` |
| `src/datos/catalogo.ts` | Modelos, plan de trabajo, ítems, publicar, descartar |
| `src/app/admin/layout.tsx` | Exige el rol; barra lateral |
| `src/app/admin/page.tsx` | Redirige a `/admin/modelos` |
| `src/app/admin/acciones.ts` | Server Actions del catálogo |
| `src/app/admin/modelos/page.tsx` | Tabla de modelos (CU-15 paso 2) |
| `src/app/admin/modelos/formulario.tsx` | Alta y edición de modelo |
| `src/app/admin/modelos/nuevo/page.tsx`, `[id]/editar/page.tsx` | Páginas del formulario |
| `src/app/admin/modelos/[id]/page.tsx` | Plan de mantenimiento (CU-16, CU-17) |
| `src/app/admin/modelos/[id]/fila-item.tsx`, `agregar-item.tsx` | Edición en línea y alta de ítems |
| `tests/unit/catalogo.test.ts`, `tests/integracion/catalogo.test.ts` | Pruebas |

---

### Task 1: Reglas del catálogo

**Files:**
- Create: `src/dominio/catalogo.ts`, `tests/unit/catalogo.test.ts`

**Interfaces:**
- Produces (en `@/dominio/catalogo`):
  - `type DatosModelo = { marca: string; nombre: string; anioDesde: number; anioHasta: number | null }`
  - `type DatosItem = { nombre: string; tipo: "reemplazo" | "inspeccion"; km: number; meses: number | null }`
  - `parsearModelo(entrada): { ok: true; datos: DatosModelo } | { ok: false; errores: ErroresCampo }`
  - `parsearItem(entrada): { ok: true; datos: DatosItem } | { ok: false; errores: ErroresCampo }`
  - `parsearIntervalo(entrada): { ok: true; datos: { km: number; meses: number | null } } | { ok: false; errores: ErroresCampo }`
  - `rangosSeSuperponen(a: [number, number | null], b: [number, number | null]): boolean`
  - `validarPublicacion(items: { nombre: string; km: number; meses: number | null }[]): string[]` (lista de errores; vacía = se puede publicar)

- [ ] **Step 1: Prueba que falla**

`tests/unit/catalogo.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parsearIntervalo, parsearItem, parsearModelo, rangosSeSuperponen, validarPublicacion } from "@/dominio/catalogo";

describe("parsearModelo (CU-15 pasos 3–4)", () => {
  it("acepta marca, modelo y rango; el año final es opcional", () => {
    expect(parsearModelo({ marca: " Renault ", nombre: "Sandero", anioDesde: "2015", anioHasta: "" })).toEqual({
      ok: true,
      datos: { marca: "Renault", nombre: "Sandero", anioDesde: 2015, anioHasta: null },
    });
  });

  it("rechaza un año inicial posterior al final (4a)", () => {
    expect(parsearModelo({ marca: "Renault", nombre: "Sandero", anioDesde: "2022", anioHasta: "2015" })).toEqual({
      ok: false,
      errores: { anioHasta: "El año final no puede ser anterior al inicial." },
    });
  });

  it("exige marca y modelo", () => {
    const r = parsearModelo({ marca: "", nombre: "", anioDesde: "2015", anioHasta: "" });
    expect(r).toEqual({ ok: false, errores: { marca: "Ingresá la marca.", nombre: "Ingresá el modelo." } });
  });
});

describe("parsearItem (CU-16 paso 3, 3b)", () => {
  it("acepta un ítem con km y meses opcionales", () => {
    expect(parsearItem({ nombre: "Aceite", tipo: "reemplazo", km: "15.000", meses: "12" })).toEqual({
      ok: true,
      datos: { nombre: "Aceite", tipo: "reemplazo", km: 15000, meses: 12 },
    });
    expect(parsearItem({ nombre: "Bujías", tipo: "reemplazo", km: "45000", meses: "" })).toMatchObject({ ok: true, datos: { meses: null } });
  });

  it("exige nombre, tipo e intervalo en km mayor que cero", () => {
    const r = parsearItem({ nombre: "", tipo: "", km: "0", meses: "" });
    expect(r).toEqual({
      ok: false,
      errores: { nombre: "Ingresá el nombre del ítem.", tipo: "Elegí si se cambia o se revisa.", km: "Ingresá un intervalo en km mayor que cero." },
    });
  });
});

describe("parsearIntervalo", () => {
  it("rechaza meses en cero", () => {
    expect(parsearIntervalo({ km: "15000", meses: "0" })).toEqual({ ok: false, errores: { meses: "Ingresá meses mayores que cero o dejalo vacío." } });
  });
});

describe("rangosSeSuperponen (CU-15 paso 4)", () => {
  it("detecta la superposición, con años abiertos", () => {
    expect(rangosSeSuperponen([2015, 2022], [2013, 2019])).toBe(true);
    expect(rangosSeSuperponen([2020, 2022], [2013, 2019])).toBe(false);
    expect(rangosSeSuperponen([2025, null], [2013, null])).toBe(true);
    expect(rangosSeSuperponen([2010, 2012], [2013, null])).toBe(false);
  });
});

describe("validarPublicacion (RF-20, CU-17 2a)", () => {
  it("exige al menos un ítem", () => {
    expect(validarPublicacion([])).toEqual(["El plan tiene que tener al menos un ítem."]);
  });

  it("rechaza intervalos no positivos e ítems duplicados", () => {
    expect(
      validarPublicacion([
        { nombre: "Aceite", km: 15000, meses: 12 },
        { nombre: "aceite ", km: 10000, meses: null },
        { nombre: "Frenos", km: 0, meses: null },
      ]),
    ).toEqual(["“aceite” está repetido.", "“Frenos” tiene un intervalo en km no válido."]);
  });

  it("un plan correcto no tiene errores", () => {
    expect(validarPublicacion([{ nombre: "Aceite", km: 15000, meses: 12 }])).toEqual([]);
  });
});
```

Run: `npm test` → FAIL, `Cannot find package '@/dominio/catalogo'`.

- [ ] **Step 2: Implementar**

`src/dominio/catalogo.ts`:

```ts
import { z } from "zod";
import { erroresDe, type ErroresCampo } from "./cuenta";

export type DatosModelo = { marca: string; nombre: string; anioDesde: number; anioHasta: number | null };
export type DatosItem = { nombre: string; tipo: "reemplazo" | "inspeccion"; km: number; meses: number | null };

/** Entero de formulario: admite punto de miles; vacío es `undefined`. */
const aNumero = (v: unknown) =>
  typeof v === "string" ? (v.trim() === "" ? undefined : Number(v.trim().replace(/\./g, ""))) : v;

const anioMax = new Date().getFullYear() + 1;
const anio = (mensaje: string) => z.number({ error: mensaje }).int({ error: mensaje }).min(1950, { error: mensaje }).max(anioMax, { error: mensaje });

const esquemaModelo = z
  .object({
    marca: z.string().trim().min(1, { error: "Ingresá la marca." }).max(60, { error: "Máximo 60 caracteres." }),
    nombre: z.string().trim().min(1, { error: "Ingresá el modelo." }).max(80, { error: "Máximo 80 caracteres." }),
    anioDesde: z.preprocess(aNumero, anio("Ingresá el año inicial.")),
    anioHasta: z.preprocess(aNumero, anio("Ingresá un año válido o dejalo vacío.").optional()),
  })
  .refine((d) => d.anioHasta === undefined || d.anioDesde <= d.anioHasta, {
    error: "El año final no puede ser anterior al inicial.",
    path: ["anioHasta"],
  });

const km = z.preprocess(
  aNumero,
  z.number({ error: "Ingresá un intervalo en km mayor que cero." }).int({ error: "Ingresá un intervalo en km mayor que cero." })
    .min(1, { error: "Ingresá un intervalo en km mayor que cero." }).max(1_000_000, { error: "Ingresá un intervalo en km mayor que cero." }),
);
const meses = z.preprocess(
  aNumero,
  z.number({ error: "Ingresá meses mayores que cero o dejalo vacío." }).int({ error: "Ingresá meses mayores que cero o dejalo vacío." })
    .min(1, { error: "Ingresá meses mayores que cero o dejalo vacío." }).max(240, { error: "Ingresá meses mayores que cero o dejalo vacío." }).optional(),
);

const esquemaIntervalo = z.object({ km, meses });
const esquemaItem = z.object({
  nombre: z.string().trim().min(1, { error: "Ingresá el nombre del ítem." }).max(80, { error: "Máximo 80 caracteres." }),
  tipo: z.enum(["reemplazo", "inspeccion"], { error: "Elegí si se cambia o se revisa." }),
  km,
  meses,
});

type Parseo<T> = { ok: true; datos: T } | { ok: false; errores: ErroresCampo };

export function parsearModelo(entrada: Record<string, unknown>): Parseo<DatosModelo> {
  const r = esquemaModelo.safeParse(entrada);
  return r.success ? { ok: true, datos: { ...r.data, anioHasta: r.data.anioHasta ?? null } } : { ok: false, errores: erroresDe(r.error) };
}

export function parsearItem(entrada: Record<string, unknown>): Parseo<DatosItem> {
  const r = esquemaItem.safeParse(entrada);
  return r.success ? { ok: true, datos: { ...r.data, meses: r.data.meses ?? null } } : { ok: false, errores: erroresDe(r.error) };
}

export function parsearIntervalo(entrada: Record<string, unknown>): Parseo<{ km: number; meses: number | null }> {
  const r = esquemaIntervalo.safeParse(entrada);
  return r.success ? { ok: true, datos: { km: r.data.km, meses: r.data.meses ?? null } } : { ok: false, errores: erroresDe(r.error) };
}

/** Dos rangos de años se superponen; `null` es un año final abierto. */
export function rangosSeSuperponen(a: [number, number | null], b: [number, number | null]): boolean {
  const finA = a[1] ?? Number.POSITIVE_INFINITY;
  const finB = b[1] ?? Number.POSITIVE_INFINITY;
  return a[0] <= finB && b[0] <= finA;
}

/** RF-20: al menos un ítem, intervalos positivos y sin ítems repetidos. */
export function validarPublicacion(items: { nombre: string; km: number; meses: number | null }[]): string[] {
  if (items.length === 0) return ["El plan tiene que tener al menos un ítem."];
  const errores: string[] = [];
  const vistos = new Set<string>();
  for (const it of items) {
    const clave = it.nombre.trim().toLowerCase();
    if (vistos.has(clave)) errores.push(`“${it.nombre.trim()}” está repetido.`);
    vistos.add(clave);
    if (!(it.km > 0) || (it.meses !== null && !(it.meses > 0))) errores.push(`“${it.nombre.trim()}” tiene un intervalo en km no válido.`);
  }
  return errores;
}
```

Run: `npm test` → PASS (36 + 10 = 46).

- [ ] **Step 3: Commit**

```bash
git add src/dominio/catalogo.ts tests/unit/catalogo.test.ts
git commit -m "feat: reglas del catálogo (RF-18 a RF-20)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Datos del catálogo con versionado

**Files:**
- Modify: `src/datos/sesion.ts`
- Create: `src/datos/catalogo.ts`, `tests/integracion/catalogo.test.ts`

**Interfaces:**
- Consumes: `conUsuario`, `rolesDelUsuario`, `Resultado` (de `@/datos/vehiculos`), reglas de la Task 1.
- Produces:
  - En `@/datos/sesion`: `exigirRol(rol: "administrador_catalogo" | "administrador_tecnico"): Promise<ClaimsUsuario>` (sin el rol → `notFound()`).
  - En `@/datos/catalogo`:
    - `type FilaModelo = { id: number; marca: string; nombre: string; anioDesde: number; anioHasta: number | null; publicado: { version: number; fecha: Date | null } | null; borrador: number | null; items: number }`
    - `type ItemDePlan = { itemId: number; nombre: string; tipo: "reemplazo" | "inspeccion"; km: number; meses: number | null }`
    - `type PlanDeTrabajo = { modelo: { id: number; marca: string; nombre: string; anioDesde: number; anioHasta: number | null }; publicado: { version: number; fecha: Date | null } | null; borrador: number | null; items: ItemDePlan[] }`
    - `listarModelos(claims)`, `marcasExistentes(claims): Promise<string[]>`, `obtenerModelo(claims, id): Promise<(DatosModelo & { id: number }) | null>`
    - `crearModelo(claims, datos: DatosModelo): Promise<Resultado<number>>`, `actualizarModelo(claims, id, datos): Promise<Resultado<null>>`
    - `planDeTrabajo(claims, modeloId): Promise<PlanDeTrabajo | null>` (ítems del borrador si existe; si no, del publicado)
    - `agregarItem(claims, modeloId, datos: DatosItem)`, `editarIntervalo(claims, modeloId, itemId, intervalo)`, `quitarItem(claims, modeloId, itemId)`: `Promise<Resultado<null>>`
    - `publicarPlan(claims, modeloId): Promise<Resultado<number>>` (devuelve la versión publicada), `descartarBorrador(claims, modeloId): Promise<Resultado<null>>`

- [ ] **Step 1: `exigirRol`**

Agregar a `src/datos/sesion.ts`:

```ts
import { notFound } from "next/navigation";
import { rolesDelUsuario } from "./cuenta";

/** Además de RLS: sin el rol, la página no existe para ese usuario. */
export async function exigirRol(rol: "administrador_catalogo" | "administrador_tecnico"): Promise<ClaimsUsuario> {
  const claims = await exigirClaims();
  if (!(await rolesDelUsuario(claims)).includes(rol)) notFound();
  return claims;
}
```

(`notFound` se suma al import existente de `next/navigation`.)

- [ ] **Step 2: Pruebas de integración que fallan**

`tests/integracion/catalogo.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  actualizarModelo,
  agregarItem,
  crearModelo,
  descartarBorrador,
  editarIntervalo,
  listarModelos,
  planDeTrabajo,
  publicarPlan,
  quitarItem,
} from "@/datos/catalogo";
import { prismaPrivilegiado as db } from "@/datos/privilegiado";
import { catalogoPublicado } from "@/datos/vehiculos";
import { asignarRol, borrarUsuarioPrueba, claimsDe, crearUsuarioPrueba } from "./ayudantes";

const MARCA = `Prueba catálogo ${Date.now()}`;
let admin: string;
let propietario: string;
let modeloId: number;

beforeAll(async () => {
  admin = await crearUsuarioPrueba("cat-admin");
  propietario = await crearUsuarioPrueba("cat-prop");
  await asignarRol(admin, 2);
});

afterAll(async () => {
  const marca = await db.marca.findUnique({ where: { nombre: MARCA } });
  if (marca) {
    const modelos = await db.modelo.findMany({ where: { marcaId: marca.id } });
    for (const m of modelos) {
      await db.planMantenimiento.deleteMany({ where: { modeloId: m.id } });
      await db.itemMantenimiento.deleteMany({ where: { modeloId: m.id } });
    }
    await db.modelo.deleteMany({ where: { marcaId: marca.id } });
    await db.marca.delete({ where: { id: marca.id } });
  }
  await borrarUsuarioPrueba(admin);
  await borrarUsuarioPrueba(propietario);
});

describe("modelos (CU-15)", () => {
  it("crea el modelo, la marca nueva y un plan vacío en borrador", async () => {
    const r = await crearModelo(claimsDe(admin), { marca: MARCA, nombre: "Sandero", anioDesde: 2013, anioHasta: 2019 });
    expect(r.ok).toBe(true);
    modeloId = r.ok ? r.valor : 0;
    const plan = await planDeTrabajo(claimsDe(admin), modeloId);
    expect(plan).toMatchObject({ publicado: null, borrador: 1, items: [] });
  });

  it("rechaza el mismo modelo con años superpuestos (4a)", async () => {
    const r = await crearModelo(claimsDe(admin), { marca: MARCA.toUpperCase(), nombre: "sandero", anioDesde: 2015, anioHasta: 2022 });
    expect(r).toEqual({ ok: false, errores: { anioDesde: `Ya existe ${MARCA} Sandero para 2013–2019. Los años no se pueden superponer.` } });
  });

  it("permite el mismo modelo en otro rango", async () => {
    expect((await crearModelo(claimsDe(admin), { marca: MARCA, nombre: "Sandero", anioDesde: 2020, anioHasta: null })).ok).toBe(true);
  });

  it("al editar, no choca consigo mismo (3a)", async () => {
    expect((await actualizarModelo(claimsDe(admin), modeloId, { marca: MARCA, nombre: "Sandero", anioDesde: 2013, anioHasta: 2018 })).ok).toBe(true);
  });

  it("un propietario no puede crear modelos (RLS)", async () => {
    await expect(crearModelo(claimsDe(propietario), { marca: MARCA, nombre: "Logan", anioDesde: 2010, anioHasta: 2015 })).rejects.toThrow();
  });
});

describe("ítems y publicación (CU-16, CU-17)", () => {
  it("no publica un plan vacío", async () => {
    expect(await publicarPlan(claimsDe(admin), modeloId)).toEqual({ ok: false, errores: { plan: "El plan tiene que tener al menos un ítem." } });
  });

  it("agrega ítems al borrador y rechaza un nombre repetido", async () => {
    expect((await agregarItem(claimsDe(admin), modeloId, { nombre: "Aceite y filtro", tipo: "reemplazo", km: 10000, meses: 12 })).ok).toBe(true);
    expect((await agregarItem(claimsDe(admin), modeloId, { nombre: "Neumáticos", tipo: "inspeccion", km: 10000, meses: null })).ok).toBe(true);
    const repetido = await agregarItem(claimsDe(admin), modeloId, { nombre: "aceite y filtro", tipo: "reemplazo", km: 5000, meses: null });
    expect(repetido).toEqual({ ok: false, errores: { nombre: "Ya hay un ítem con ese nombre en el plan." } });
  });

  it("publica la versión 1, que el propietario ya ve", async () => {
    expect(await publicarPlan(claimsDe(admin), modeloId)).toEqual({ ok: true, valor: 1 });
    const marcas = await catalogoPublicado(claimsDe(propietario));
    expect(marcas.find((m) => m.nombre === MARCA)?.modelos.map((m) => m.id)).toContain(modeloId);
    expect(await planDeTrabajo(claimsDe(admin), modeloId)).toMatchObject({ publicado: { version: 1 }, borrador: null });
  });

  it("editar el plan publicado crea la versión 2 en borrador; la publicada no cambia (CU-16 3a)", async () => {
    const [aceite] = (await planDeTrabajo(claimsDe(admin), modeloId))!.items.filter((i) => i.nombre === "Aceite y filtro");
    expect((await editarIntervalo(claimsDe(admin), modeloId, aceite!.itemId, { km: 15000, meses: 12 })).ok).toBe(true);
    const plan = (await planDeTrabajo(claimsDe(admin), modeloId))!;
    expect(plan).toMatchObject({ publicado: { version: 1 }, borrador: 2 });
    expect(plan.items.find((i) => i.nombre === "Aceite y filtro")?.km).toBe(15000);
    const v1 = await db.planMantenimiento.findFirstOrThrow({ where: { modeloId, version: 1 }, include: { intervalos: true } });
    expect(v1.intervalos.find((i) => i.itemId === aceite!.itemId)?.intervaloKm).toBe(10000);
  });

  it("quitar un ítem afecta solo al borrador", async () => {
    const [neum] = (await planDeTrabajo(claimsDe(admin), modeloId))!.items.filter((i) => i.nombre === "Neumáticos");
    expect((await quitarItem(claimsDe(admin), modeloId, neum!.itemId)).ok).toBe(true);
    expect((await planDeTrabajo(claimsDe(admin), modeloId))!.items.map((i) => i.nombre)).toEqual(["Aceite y filtro"]);
    expect(await db.intervaloPlan.count({ where: { plan: { modeloId, version: 1 } } })).toBe(2);
  });

  it("publicar la versión 2 reemplaza a la 1: siempre hay un solo plan publicado", async () => {
    expect(await publicarPlan(claimsDe(admin), modeloId)).toEqual({ ok: true, valor: 2 });
    const planes = await db.planMantenimiento.findMany({ where: { modeloId }, orderBy: { version: "asc" } });
    expect(planes.map((p) => p.estado)).toEqual(["reemplazado", "publicado"]);
  });

  it("descartar un borrador vuelve a la versión publicada", async () => {
    const [aceite] = (await planDeTrabajo(claimsDe(admin), modeloId))!.items;
    await editarIntervalo(claimsDe(admin), modeloId, aceite!.itemId, { km: 20000, meses: null });
    expect((await planDeTrabajo(claimsDe(admin), modeloId))!.borrador).toBe(3);
    expect((await descartarBorrador(claimsDe(admin), modeloId)).ok).toBe(true);
    const plan = (await planDeTrabajo(claimsDe(admin), modeloId))!;
    expect(plan).toMatchObject({ borrador: null, publicado: { version: 2 } });
    expect(plan.items[0]?.km).toBe(15000);
  });

  it("la tabla de modelos muestra versión publicada, borrador e ítems", async () => {
    const fila = (await listarModelos(claimsDe(admin))).find((m) => m.id === modeloId);
    expect(fila).toMatchObject({ marca: MARCA, nombre: "Sandero", publicado: { version: 2 }, borrador: null, items: 1 });
  });
});
```

Run: `npm run test:integracion` → FAIL, `Cannot find package '@/datos/catalogo'`.

- [ ] **Step 3: Implementar**

`src/datos/catalogo.ts`:

```ts
import { rangosSeSuperponen, validarPublicacion, type DatosItem, type DatosModelo } from "@/dominio/catalogo";
import { conUsuario, type ClaimsUsuario, type TxUsuario } from "./cliente-usuario";
import type { Resultado } from "./vehiculos";

export type FilaModelo = {
  id: number;
  marca: string;
  nombre: string;
  anioDesde: number;
  anioHasta: number | null;
  publicado: { version: number; fecha: Date | null } | null;
  borrador: number | null;
  items: number;
};
export type ItemDePlan = { itemId: number; nombre: string; tipo: "reemplazo" | "inspeccion"; km: number; meses: number | null };
export type PlanDeTrabajo = {
  modelo: { id: number; marca: string; nombre: string; anioDesde: number; anioHasta: number | null };
  publicado: { version: number; fecha: Date | null } | null;
  borrador: number | null;
  items: ItemDePlan[];
};

const NO_ENCONTRADO = { ok: false as const, errores: { formulario: "No encontramos el modelo." } };
const rango = (desde: number, hasta: number | null) => (hasta ? `${desde}–${hasta}` : `desde ${desde}`);

export async function listarModelos(claims: ClaimsUsuario): Promise<FilaModelo[]> {
  return conUsuario(claims, async (tx) => {
    const modelos = await tx.modelo.findMany({
      include: { marca: true, planes: { include: { _count: { select: { intervalos: true } } } } },
      orderBy: [{ marca: { nombre: "asc" } }, { nombre: "asc" }, { anioDesde: "asc" }],
    });
    return modelos.map((m) => {
      const pub = m.planes.find((p) => p.estado === "publicado");
      const bor = m.planes.find((p) => p.estado === "borrador");
      return {
        id: m.id,
        marca: m.marca.nombre,
        nombre: m.nombre,
        anioDesde: m.anioDesde,
        anioHasta: m.anioHasta,
        publicado: pub ? { version: pub.version, fecha: pub.fechaPublicacion } : null,
        borrador: bor?.version ?? null,
        items: (bor ?? pub)?._count.intervalos ?? 0,
      };
    });
  });
}

export async function marcasExistentes(claims: ClaimsUsuario): Promise<string[]> {
  return conUsuario(claims, async (tx) => (await tx.marca.findMany({ orderBy: { nombre: "asc" } })).map((m) => m.nombre));
}

export async function obtenerModelo(claims: ClaimsUsuario, id: number): Promise<(DatosModelo & { id: number }) | null> {
  if (!Number.isInteger(id)) return null;
  return conUsuario(claims, async (tx) => {
    const m = await tx.modelo.findUnique({ where: { id }, include: { marca: true } });
    return m && { id: m.id, marca: m.marca.nombre, nombre: m.nombre, anioDesde: m.anioDesde, anioHasta: m.anioHasta };
  });
}

/** CU-15 paso 4: misma marca y nombre (sin distinguir mayúsculas) con años superpuestos. */
async function superpuesto(tx: TxUsuario, datos: DatosModelo, excepto?: number): Promise<string | null> {
  const iguales = await tx.modelo.findMany({
    where: {
      nombre: { equals: datos.nombre, mode: "insensitive" },
      marca: { nombre: { equals: datos.marca, mode: "insensitive" } },
      ...(excepto ? { id: { not: excepto } } : {}),
    },
    include: { marca: true },
  });
  const choque = iguales.find((m) => rangosSeSuperponen([datos.anioDesde, datos.anioHasta], [m.anioDesde, m.anioHasta]));
  return choque
    ? `Ya existe ${choque.marca.nombre} ${choque.nombre} para ${rango(choque.anioDesde, choque.anioHasta)}. Los años no se pueden superponer.`
    : null;
}

async function marcaPorNombre(tx: TxUsuario, nombre: string) {
  const existente = await tx.marca.findFirst({ where: { nombre: { equals: nombre, mode: "insensitive" } } });
  return existente ?? (await tx.marca.create({ data: { nombre } }));
}

/** CU-15 paso 5: registra el modelo con un plan vacío en borrador. */
export async function crearModelo(claims: ClaimsUsuario, datos: DatosModelo): Promise<Resultado<number>> {
  return conUsuario(claims, async (tx) => {
    const choque = await superpuesto(tx, datos);
    if (choque) return { ok: false, errores: { anioDesde: choque } };
    const marca = await marcaPorNombre(tx, datos.marca);
    const m = await tx.modelo.create({
      data: {
        marcaId: marca.id,
        nombre: datos.nombre,
        anioDesde: datos.anioDesde,
        anioHasta: datos.anioHasta,
        planes: { create: { version: 1, estado: "borrador" } },
      },
    });
    return { ok: true, valor: m.id };
  });
}

/** CU-15 3a. */
export async function actualizarModelo(claims: ClaimsUsuario, id: number, datos: DatosModelo): Promise<Resultado<null>> {
  return conUsuario(claims, async (tx) => {
    if (!(await tx.modelo.findUnique({ where: { id } }))) return NO_ENCONTRADO;
    const choque = await superpuesto(tx, datos, id);
    if (choque) return { ok: false, errores: { anioDesde: choque } };
    const marca = await marcaPorNombre(tx, datos.marca);
    await tx.modelo.update({
      where: { id },
      data: { marcaId: marca.id, nombre: datos.nombre, anioDesde: datos.anioDesde, anioHasta: datos.anioHasta },
    });
    return { ok: true, valor: null };
  });
}

export async function planDeTrabajo(claims: ClaimsUsuario, modeloId: number): Promise<PlanDeTrabajo | null> {
  if (!Number.isInteger(modeloId)) return null;
  return conUsuario(claims, async (tx) => {
    const m = await tx.modelo.findUnique({
      where: { id: modeloId },
      include: {
        marca: true,
        planes: { where: { estado: { in: ["borrador", "publicado"] } }, include: { intervalos: { include: { item: true } } } },
      },
    });
    if (!m) return null;
    const pub = m.planes.find((p) => p.estado === "publicado");
    const bor = m.planes.find((p) => p.estado === "borrador");
    const vigente = bor ?? pub;
    return {
      modelo: { id: m.id, marca: m.marca.nombre, nombre: m.nombre, anioDesde: m.anioDesde, anioHasta: m.anioHasta },
      publicado: pub ? { version: pub.version, fecha: pub.fechaPublicacion } : null,
      borrador: bor?.version ?? null,
      items: (vigente?.intervalos ?? [])
        .map((i) => ({ itemId: i.itemId, nombre: i.item.nombre, tipo: i.item.tipo, km: i.intervaloKm, meses: i.intervaloMeses }))
        .sort((a, b) => a.km - b.km || a.nombre.localeCompare(b.nombre, "es")),
    };
  });
}

/** Devuelve el id del borrador; si no hay, lo crea copiando el publicado (CU-16 3a). */
async function asegurarBorrador(tx: TxUsuario, modeloId: number): Promise<number | null> {
  const planes = await tx.planMantenimiento.findMany({ where: { modeloId }, include: { intervalos: true } });
  if (planes.length === 0) return null;
  const borrador = planes.find((p) => p.estado === "borrador");
  if (borrador) return borrador.id;
  const publicado = planes.find((p) => p.estado === "publicado");
  const nuevo = await tx.planMantenimiento.create({
    data: {
      modeloId,
      version: Math.max(...planes.map((p) => p.version)) + 1,
      estado: "borrador",
      intervalos: {
        create: (publicado?.intervalos ?? []).map((i) => ({ itemId: i.itemId, intervaloKm: i.intervaloKm, intervaloMeses: i.intervaloMeses })),
      },
    },
  });
  return nuevo.id;
}

/** CU-16 pasos 3–4: crea o reutiliza el ítem del modelo y lo suma al borrador. */
export async function agregarItem(claims: ClaimsUsuario, modeloId: number, datos: DatosItem): Promise<Resultado<null>> {
  return conUsuario(claims, async (tx) => {
    const planId = await asegurarBorrador(tx, modeloId);
    if (!planId) return NO_ENCONTRADO;
    const item =
      (await tx.itemMantenimiento.findFirst({ where: { modeloId, nombre: { equals: datos.nombre, mode: "insensitive" } } })) ??
      (await tx.itemMantenimiento.create({ data: { modeloId, nombre: datos.nombre, tipo: datos.tipo } }));
    if (await tx.intervaloPlan.findUnique({ where: { planId_itemId: { planId, itemId: item.id } } })) {
      return { ok: false, errores: { nombre: "Ya hay un ítem con ese nombre en el plan." } };
    }
    await tx.intervaloPlan.create({ data: { planId, itemId: item.id, intervaloKm: datos.km, intervaloMeses: datos.meses } });
    return { ok: true, valor: null };
  });
}

/** CU-16 3a: modifica los intervalos de un ítem en el borrador. */
export async function editarIntervalo(
  claims: ClaimsUsuario,
  modeloId: number,
  itemId: number,
  intervalo: { km: number; meses: number | null },
): Promise<Resultado<null>> {
  return conUsuario(claims, async (tx) => {
    const planId = await asegurarBorrador(tx, modeloId);
    if (!planId) return NO_ENCONTRADO;
    const r = await tx.intervaloPlan.updateMany({
      where: { planId, itemId },
      data: { intervaloKm: intervalo.km, intervaloMeses: intervalo.meses },
    });
    return r.count === 1 ? { ok: true, valor: null } : { ok: false, errores: { formulario: "El ítem no está en el plan." } };
  });
}

/** CU-16 3a: quita el ítem del borrador (el ítem queda para el historial). */
export async function quitarItem(claims: ClaimsUsuario, modeloId: number, itemId: number): Promise<Resultado<null>> {
  return conUsuario(claims, async (tx) => {
    const planId = await asegurarBorrador(tx, modeloId);
    if (!planId) return NO_ENCONTRADO;
    await tx.intervaloPlan.deleteMany({ where: { planId, itemId } });
    return { ok: true, valor: null };
  });
}

/** CU-17: valida (RF-20) y publica; la versión anterior pasa a reemplazada en la misma transacción. */
export async function publicarPlan(claims: ClaimsUsuario, modeloId: number): Promise<Resultado<number>> {
  return conUsuario(claims, async (tx) => {
    const borrador = await tx.planMantenimiento.findFirst({
      where: { modeloId, estado: "borrador" },
      include: { intervalos: { include: { item: true } } },
    });
    if (!borrador) return { ok: false, errores: { plan: "No hay un borrador para publicar." } };
    const errores = validarPublicacion(
      borrador.intervalos.map((i) => ({ nombre: i.item.nombre, km: i.intervaloKm, meses: i.intervaloMeses })),
    );
    if (errores.length > 0) return { ok: false, errores: { plan: errores.join(" ") } };
    await tx.planMantenimiento.updateMany({ where: { modeloId, estado: "publicado" }, data: { estado: "reemplazado" } });
    await tx.planMantenimiento.update({ where: { id: borrador.id }, data: { estado: "publicado", fechaPublicacion: new Date() } });
    return { ok: true, valor: borrador.version };
  });
}

/** Descarta el borrador y vuelve a la versión publicada. */
export async function descartarBorrador(claims: ClaimsUsuario, modeloId: number): Promise<Resultado<null>> {
  return conUsuario(claims, async (tx) => {
    const hayPublicado = await tx.planMantenimiento.count({ where: { modeloId, estado: "publicado" } });
    if (!hayPublicado) return { ok: false, errores: { plan: "No hay una versión publicada a la cual volver." } };
    await tx.planMantenimiento.deleteMany({ where: { modeloId, estado: "borrador" } });
    return { ok: true, valor: null };
  });
}
```

Run: `npm run test:integracion` → PASS (37 + 13 = 50).

- [ ] **Step 4: Commit**

```bash
git add src/datos/sesion.ts src/datos/catalogo.ts tests/integracion/catalogo.test.ts
git commit -m "feat: datos del catálogo con versionado del plan (CU-15 a CU-17)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Panel de administración — layout, acciones y modelos

**Files:**
- Create: `src/app/admin/layout.tsx`, `src/app/admin/page.tsx`, `src/app/admin/acciones.ts`, `src/app/admin/modelos/page.tsx`, `src/app/admin/modelos/formulario.tsx`, `src/app/admin/modelos/nuevo/page.tsx`, `src/app/admin/modelos/[id]/editar/page.tsx`

**Interfaces:**
- Consumes: Task 2; `parsearModelo`, `parsearItem`, `parsearIntervalo`; `Campo`, `Aviso`, `Button`, `Logo`.
- Produces: acciones `guardarModelo(id: number | null, previo, datos)`, `sumarItem(modeloId, previo, datos)`, `cambiarIntervalo(modeloId, itemId, previo, datos)`, `sacarItem(modeloId, itemId)`, `publicar(modeloId, previo)`, `descartar(modeloId)`, con `type EstadoAdmin = { errores?: ErroresCampo; ok?: true; mensaje?: string }`.

- [ ] **Step 1: Layout y redirección**

`src/app/admin/layout.tsx`:

```tsx
import { Boxes, Users } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { exigirRol } from "@/datos/sesion";

export default async function LayoutAdmin({ children }: { children: React.ReactNode }) {
  const claims = await exigirRol("administrador_catalogo");
  return (
    <div className="min-h-dvh md:flex">
      <aside className="flex flex-col border-b border-border bg-muted md:w-60 md:shrink-0 md:border-b-0 md:border-r">
        <div className="px-5 pb-4 pt-5">
          <Logo subtitulo="Administración" />
        </div>
        <nav className="flex gap-1 px-3 pb-3 md:flex-col md:pb-0">
          <Link href="/admin/modelos" className="flex h-10 items-center gap-2 border-l-2 border-oro bg-card px-3 text-sm font-medium">
            <Boxes className="size-4" aria-hidden="true" /> Modelos
          </Link>
          <span className="flex h-10 items-center gap-2 px-3 text-sm text-muted-foreground">
            <Users className="size-4" aria-hidden="true" /> Usuarios
            <span className="rounded-sm bg-card px-1.5 text-[11px]">Próximamente</span>
          </span>
        </nav>
        <div className="mt-auto px-5 py-4 text-[13px]">
          <p className="text-muted-foreground">{claims.email}</p>
          <Link href="/vehiculos" className="text-primary underline underline-offset-4">
            Ir a Mis vehículos
          </Link>
        </div>
      </aside>
      <main className="w-full max-w-[1120px] px-4 py-6 md:px-8 md:py-8">{children}</main>
    </div>
  );
}
```

`src/app/admin/page.tsx`:

```tsx
import { redirect } from "next/navigation";

export default function Admin() {
  redirect("/admin/modelos");
}
```

- [ ] **Step 2: Acciones**

`src/app/admin/acciones.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  actualizarModelo,
  agregarItem,
  crearModelo,
  descartarBorrador,
  editarIntervalo,
  publicarPlan,
  quitarItem,
} from "@/datos/catalogo";
import { exigirRol } from "@/datos/sesion";
import { parsearIntervalo, parsearItem, parsearModelo } from "@/dominio/catalogo";
import type { ErroresCampo } from "@/dominio/cuenta";

export type EstadoAdmin = { errores?: ErroresCampo; ok?: true; mensaje?: string };
const admin = () => exigirRol("administrador_catalogo");

/** CU-15: alta (id null) o edición. */
export async function guardarModelo(id: number | null, _previo: EstadoAdmin, datos: FormData): Promise<EstadoAdmin> {
  const claims = await admin();
  const p = parsearModelo(Object.fromEntries(datos));
  if (!p.ok) return { errores: p.errores };
  const r = id === null ? await crearModelo(claims, p.datos) : await actualizarModelo(claims, id, p.datos);
  if (!r.ok) return { errores: r.errores };
  revalidatePath("/admin/modelos");
  redirect(`/admin/modelos/${id ?? r.valor}`);
}

/** CU-16 paso 3. */
export async function sumarItem(modeloId: number, _previo: EstadoAdmin, datos: FormData): Promise<EstadoAdmin> {
  const claims = await admin();
  const p = parsearItem(Object.fromEntries(datos));
  if (!p.ok) return { errores: p.errores };
  const r = await agregarItem(claims, modeloId, p.datos);
  if (!r.ok) return { errores: r.errores };
  revalidatePath(`/admin/modelos/${modeloId}`);
  return { ok: true };
}

/** CU-16 3a. */
export async function cambiarIntervalo(modeloId: number, itemId: number, _previo: EstadoAdmin, datos: FormData): Promise<EstadoAdmin> {
  const claims = await admin();
  const p = parsearIntervalo(Object.fromEntries(datos));
  if (!p.ok) return { errores: p.errores };
  const r = await editarIntervalo(claims, modeloId, itemId, p.datos);
  if (!r.ok) return { errores: r.errores };
  revalidatePath(`/admin/modelos/${modeloId}`);
  return { ok: true };
}

/** CU-16 3a. */
export async function sacarItem(modeloId: number, itemId: number): Promise<void> {
  const claims = await admin();
  await quitarItem(claims, modeloId, itemId);
  revalidatePath(`/admin/modelos/${modeloId}`);
}

/** CU-17. */
export async function publicar(modeloId: number, _previo: EstadoAdmin): Promise<EstadoAdmin> {
  const claims = await admin();
  const r = await publicarPlan(claims, modeloId);
  if (!r.ok) return { errores: r.errores };
  revalidatePath(`/admin/modelos/${modeloId}`);
  revalidatePath("/admin/modelos");
  return { ok: true, mensaje: `Versión ${r.valor} publicada. Los propietarios la ven desde su próxima consulta.` };
}

export async function descartar(modeloId: number): Promise<void> {
  const claims = await admin();
  await descartarBorrador(claims, modeloId);
  revalidatePath(`/admin/modelos/${modeloId}`);
}
```

- [ ] **Step 3: Tabla de modelos**

`src/app/admin/modelos/page.tsx`:

```tsx
import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { listarModelos } from "@/datos/catalogo";
import { exigirRol } from "@/datos/sesion";
import { formatearFecha } from "@/dominio/fechas";

export const metadata: Metadata = { title: "Modelos · Administración" };

export default async function ModelosPagina() {
  const claims = await exigirRol("administrador_catalogo");
  const modelos = await listarModelos(claims);

  return (
    <section>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-[22px] font-semibold">Modelos</h1>
        <Button asChild className="h-12">
          <Link href="/admin/modelos/nuevo">
            <Plus className="size-4" aria-hidden="true" /> Nuevo modelo
          </Link>
        </Button>
      </div>
      <div className="mt-6 overflow-x-auto rounded-[14px] border border-border bg-card">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="text-left text-muted-foreground">
            <tr className="border-b border-border">
              <th className="px-4 py-3 font-medium">Marca</th>
              <th className="px-4 py-3 font-medium">Modelo</th>
              <th className="px-4 py-3 font-medium">Años</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Ítems</th>
              <th className="px-4 py-3 font-medium">Publicado el</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {modelos.map((m) => (
              <tr key={m.id}>
                <td className="whitespace-nowrap px-4 py-3">{m.marca}</td>
                <td className="whitespace-nowrap px-4 py-3">{m.nombre}</td>
                <td className="whitespace-nowrap px-4 py-3 tabular-nums">{m.anioHasta ? `${m.anioDesde}–${m.anioHasta}` : `desde ${m.anioDesde}`}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {m.publicado && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[13px] text-primary">Publicado · versión {m.publicado.version}</span>}
                    {m.borrador && <span className="rounded-full bg-muted px-2 py-0.5 text-[13px] text-muted-foreground">Borrador · versión {m.borrador}</span>}
                  </div>
                </td>
                <td className="px-4 py-3 tabular-nums">{m.items}</td>
                <td className="whitespace-nowrap px-4 py-3 tabular-nums">{m.publicado?.fecha ? formatearFecha(m.publicado.fecha) : "—"}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/modelos/${m.id}`} className="text-primary underline underline-offset-4">Ver plan</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
```

Nota: `formatearFecha` lee la fecha en UTC; para una marca de tiempo (`fecha_publicacion`) puede mostrar el día siguiente después de las 21 h de Argentina. Se acepta en el panel de administración; si molesta, agregar `formatearFechaHora` en la Iteración 2.

- [ ] **Step 4: Formulario de modelo y páginas**

`src/app/admin/modelos/formulario.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import { Aviso } from "@/components/aviso";
import { Campo } from "@/components/campo";
import { Button } from "@/components/ui/button";
import type { DatosModelo } from "@/dominio/catalogo";
import type { EstadoAdmin } from "../acciones";

type Props = {
  accion: (previo: EstadoAdmin, datos: FormData) => Promise<EstadoAdmin>;
  marcas: string[];
  inicial?: DatosModelo;
  textoBoton: string;
};

/** CU-15: alta y edición de modelo. */
export function FormularioModelo({ accion, marcas, inicial, textoBoton }: Props) {
  const [estado, enviar, enviando] = useActionState(accion, {});
  const e = estado.errores ?? {};
  return (
    <form action={enviar} className="max-w-[560px] space-y-4" noValidate>
      {e.formulario && <Aviso tipo="error">{e.formulario}</Aviso>}
      <div className="space-y-1.5">
        <Campo id="marca" etiqueta="Marca" nombre="marca" lista="marcas" valorInicial={inicial?.marca} error={e.marca} ayuda="Elegí una existente o escribí una nueva." />
        <datalist id="marcas">
          {marcas.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
      </div>
      <Campo id="nombre" etiqueta="Modelo" nombre="nombre" valorInicial={inicial?.nombre} error={e.nombre} />
      <div className="grid grid-cols-2 gap-3">
        <Campo id="anioDesde" etiqueta="Desde el año" nombre="anioDesde" inputMode="numeric" valorInicial={inicial ? String(inicial.anioDesde) : undefined} />
        <Campo id="anioHasta" etiqueta="Hasta el año" nombre="anioHasta" inputMode="numeric" valorInicial={inicial?.anioHasta ? String(inicial.anioHasta) : undefined} error={e.anioHasta} />
      </div>
      <p className="text-[13px] text-muted-foreground">Dejá vacío “Hasta” si se sigue fabricando.</p>
      {e.anioDesde && <Aviso tipo="error">{e.anioDesde}</Aviso>}
      <Button type="submit" className="h-12" disabled={enviando}>
        {textoBoton}
      </Button>
      {!inicial && <p className="text-[13px] text-muted-foreground">Al crearlo, el modelo queda con un plan vacío en borrador.</p>}
    </form>
  );
}
```

Para que el campo Marca muestre las sugerencias, en `src/components/campo.tsx`:
- agregar `lista?: string;` al tipo `Props`;
- sumar `lista` a la desestructuración de los parámetros;
- pasar `list={lista}` al `<Input>`.

`src/app/admin/modelos/nuevo/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { marcasExistentes } from "@/datos/catalogo";
import { exigirRol } from "@/datos/sesion";
import { guardarModelo } from "../../acciones";
import { FormularioModelo } from "../formulario";

export const metadata: Metadata = { title: "Nuevo modelo · Administración" };

export default async function NuevoModeloPagina() {
  const claims = await exigirRol("administrador_catalogo");
  const marcas = await marcasExistentes(claims);
  return (
    <section>
      <p className="text-sm">
        <Link href="/admin/modelos" className="text-primary underline underline-offset-4">Modelos</Link>
        <span className="text-muted-foreground"> / Nuevo modelo</span>
      </p>
      <h1 className="mb-6 mt-2 text-[22px] font-semibold">Nuevo modelo</h1>
      <FormularioModelo accion={guardarModelo.bind(null, null)} marcas={marcas} textoBoton="Crear modelo" />
    </section>
  );
}
```

`src/app/admin/modelos/[id]/editar/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { marcasExistentes, obtenerModelo } from "@/datos/catalogo";
import { exigirRol } from "@/datos/sesion";
import { guardarModelo } from "../../../acciones";
import { FormularioModelo } from "../../formulario";

export const metadata: Metadata = { title: "Editar modelo · Administración" };

export default async function EditarModeloPagina({ params }: PageProps<"/admin/modelos/[id]/editar">) {
  const id = Number((await params).id);
  const claims = await exigirRol("administrador_catalogo");
  const [modelo, marcas] = await Promise.all([obtenerModelo(claims, id), marcasExistentes(claims)]);
  if (!modelo) notFound();
  return (
    <section>
      <p className="text-sm">
        <Link href={`/admin/modelos/${id}`} className="text-primary underline underline-offset-4">
          {modelo.marca} {modelo.nombre}
        </Link>
        <span className="text-muted-foreground"> / Editar</span>
      </p>
      <h1 className="mb-6 mt-2 text-[22px] font-semibold">Editar modelo</h1>
      <FormularioModelo accion={guardarModelo.bind(null, id)} marcas={marcas} inicial={modelo} textoBoton="Guardar cambios" />
    </section>
  );
}
```

- [ ] **Step 5: Verificar y commit**

```bash
npm run typecheck && npm run lint && npm run build
git add -A
git commit -m "feat: panel de administración y gestión de modelos (CU-15)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Plan de mantenimiento — ítems y publicación

**Files:**
- Create: `src/app/admin/modelos/[id]/page.tsx`, `src/app/admin/modelos/[id]/fila-item.tsx`, `src/app/admin/modelos/[id]/agregar-item.tsx`, `src/app/admin/modelos/[id]/publicar.tsx`

- [ ] **Step 1: Fila con edición en línea**

`src/app/admin/modelos/[id]/fila-item.tsx`:

```tsx
"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import type { ItemDePlan } from "@/datos/catalogo";
import { formatearKm } from "@/dominio/kilometraje";
import { cambiarIntervalo, sacarItem, type EstadoAdmin } from "../../../acciones";

const entrada = "h-10 w-28 rounded-md border border-input bg-card px-2 text-sm tabular-nums";

export function FilaItem({ modeloId, item }: { modeloId: number; item: ItemDePlan }) {
  const [editando, setEditando] = useState(false);
  const [estado, enviar, enviando] = useActionState(async (previo: EstadoAdmin, datos: FormData) => {
    const r = await cambiarIntervalo(modeloId, item.itemId, previo, datos);
    if (r.ok) setEditando(false);
    return r;
  }, {});
  const error = estado.errores?.km ?? estado.errores?.meses ?? estado.errores?.formulario;

  return (
    <tr>
      <td className="px-4 py-3">{item.nombre}</td>
      <td className="px-4 py-3">
        <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[13px]">{item.tipo === "reemplazo" ? "Cambiar" : "Revisar"}</span>
      </td>
      {editando ? (
        <td colSpan={3} className="px-4 py-2">
          <form action={enviar} className="flex flex-wrap items-center gap-2">
            <input name="km" defaultValue={item.km} inputMode="numeric" aria-label="Cada (km)" className={entrada} />
            <input name="meses" defaultValue={item.meses ?? ""} inputMode="numeric" aria-label="Cada (meses)" className={entrada} />
            <Button type="submit" size="sm" disabled={enviando}>Guardar</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setEditando(false)}>Cancelar</Button>
            {error && <span className="w-full text-[13px] text-destructive">{error}</span>}
          </form>
        </td>
      ) : (
        <>
          <td className="px-4 py-3 tabular-nums">{formatearKm(item.km)}</td>
          <td className="px-4 py-3 tabular-nums">{item.meses ?? "—"}</td>
          <td className="px-4 py-3">
            <div className="flex justify-end gap-1">
              <Button type="button" size="icon" variant="ghost" aria-label={`Editar ${item.nombre}`} onClick={() => setEditando(true)}>
                <Pencil className="size-4" />
              </Button>
              <form action={sacarItem.bind(null, modeloId, item.itemId)}>
                <Button type="submit" size="icon" variant="ghost" aria-label={`Quitar ${item.nombre}`}>
                  <Trash2 className="size-4" />
                </Button>
              </form>
            </div>
          </td>
        </>
      )}
    </tr>
  );
}
```

- [ ] **Step 2: Agregar ítem**

`src/app/admin/modelos/[id]/agregar-item.tsx`:

```tsx
"use client";

import { useActionState, useState } from "react";
import { Campo } from "@/components/campo";
import { Selector } from "@/components/selector";
import { Button } from "@/components/ui/button";
import { sumarItem, type EstadoAdmin } from "../../../acciones";

/** CU-16 paso 3. */
export function AgregarItem({ modeloId }: { modeloId: number }) {
  const [abierto, setAbierto] = useState(false);
  const [tipo, setTipo] = useState("");
  const [estado, enviar, enviando] = useActionState(async (previo: EstadoAdmin, datos: FormData) => {
    const r = await sumarItem(modeloId, previo, datos);
    if (r.ok) {
      setAbierto(false);
      setTipo("");
    }
    return r;
  }, {});
  const e = estado.errores ?? {};

  if (!abierto) {
    return (
      <Button type="button" variant="outline" className="h-12" onClick={() => setAbierto(true)}>
        Agregar ítem
      </Button>
    );
  }
  return (
    <form action={enviar} className="max-w-[560px] space-y-4 rounded-[14px] border border-border bg-card p-4" noValidate>
      <Campo id="item-nombre" etiqueta="Ítem" nombre="nombre" error={e.nombre} />
      <Selector
        id="item-tipo"
        etiqueta="Tipo"
        nombre="tipo"
        valor={tipo}
        onCambio={setTipo}
        opciones={[{ valor: "reemplazo", texto: "Cambiar (reemplazo)" }, { valor: "inspeccion", texto: "Revisar (inspección)" }]}
        error={e.tipo}
      />
      <div className="grid grid-cols-2 gap-3">
        <Campo id="item-km" etiqueta="Cada (km)" nombre="km" inputMode="numeric" error={e.km} />
        <Campo id="item-meses" etiqueta="Cada (meses)" nombre="meses" inputMode="numeric" ayuda="Solo si el fabricante lo indica." error={e.meses} />
      </div>
      <div className="flex gap-2">
        <Button type="submit" className="h-12" disabled={enviando}>Agregar al plan</Button>
        <Button type="button" variant="outline" className="h-12" onClick={() => setAbierto(false)}>Cancelar</Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 3: Publicar y descartar**

`src/app/admin/modelos/[id]/publicar.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import { Aviso } from "@/components/aviso";
import { Button } from "@/components/ui/button";
import { descartar, publicar, type EstadoAdmin } from "../../../acciones";

/** CU-17 y descartar borrador. */
export function AccionesPlan({ modeloId, version, puedeDescartar }: { modeloId: number; version: number; puedeDescartar: boolean }) {
  const [estado, enviar, enviando] = useActionState((previo: EstadoAdmin) => publicar(modeloId, previo), {});
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {puedeDescartar && (
          <form action={descartar.bind(null, modeloId)}>
            <Button type="submit" variant="outline" className="h-12">Descartar borrador</Button>
          </form>
        )}
        <form action={enviar}>
          <Button type="submit" className="h-12" disabled={enviando}>Publicar versión {version}</Button>
        </form>
      </div>
      {estado.errores?.plan && <Aviso tipo="error">{estado.errores.plan}</Aviso>}
      {estado.mensaje && <Aviso tipo="exito">{estado.mensaje}</Aviso>}
    </div>
  );
}
```

- [ ] **Step 4: Página del plan**

`src/app/admin/modelos/[id]/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Aviso } from "@/components/aviso";
import { planDeTrabajo } from "@/datos/catalogo";
import { exigirRol } from "@/datos/sesion";
import { AgregarItem } from "./agregar-item";
import { FilaItem } from "./fila-item";
import { AccionesPlan } from "./publicar";

export const metadata: Metadata = { title: "Plan de mantenimiento · Administración" };

export default async function PlanPagina({ params }: PageProps<"/admin/modelos/[id]">) {
  const id = Number((await params).id);
  const claims = await exigirRol("administrador_catalogo");
  const plan = await planDeTrabajo(claims, id);
  if (!plan) notFound();
  const { modelo, publicado, borrador, items } = plan;
  const anios = modelo.anioHasta ? `${modelo.anioDesde}–${modelo.anioHasta}` : `desde ${modelo.anioDesde}`;

  return (
    <section>
      <p className="text-sm">
        <Link href="/admin/modelos" className="text-primary underline underline-offset-4">Modelos</Link>
        <span className="text-muted-foreground"> / {modelo.marca} {modelo.nombre} {anios} · </span>
        <Link href={`/admin/modelos/${id}/editar`} className="text-primary underline underline-offset-4">Editar datos</Link>
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
        <h1 className="flex items-center gap-2 text-[22px] font-semibold">
          Plan de mantenimiento
          {borrador ? (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[13px] font-normal text-muted-foreground">Borrador · versión {borrador}</span>
          ) : (
            publicado && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[13px] font-normal text-primary">Publicado · versión {publicado.version}</span>
          )}
        </h1>
        {borrador && <AccionesPlan modeloId={id} version={borrador} puedeDescartar={publicado !== null} />}
      </div>

      <div className="mt-4">
        {borrador && publicado && (
          <Aviso tipo="info">La versión {publicado.version} sigue publicada y es la que usan los propietarios hasta que publiques esta.</Aviso>
        )}
        {!borrador && publicado && (
          <Aviso tipo="info">Cualquier cambio crea la versión {publicado.version + 1} en borrador, sin afectar a los propietarios hasta que la publiques.</Aviso>
        )}
      </div>

      <div className="mt-6 overflow-x-auto rounded-[14px] border border-border bg-card">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="text-left text-muted-foreground">
            <tr className="border-b border-border">
              <th className="px-4 py-3 font-medium">Ítem</th>
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 font-medium">Cada (km)</th>
              <th className="px-4 py-3 font-medium">Cada (meses)</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-muted-foreground">Todavía no hay ítems. Agregá el primero.</td>
              </tr>
            ) : (
              items.map((i) => <FilaItem key={i.itemId} modeloId={id} item={i} />)
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-4">
        <AgregarItem modeloId={id} />
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Verificar y commit**

```bash
npm test && npm run test:integracion && npm run typecheck && npm run lint && npm run build
git add -A
git commit -m "feat: ítems del plan, versionado y publicación (CU-16, CU-17)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Verificación con Felipe y pull request

- [ ] **Step 1 (Felipe), en su Chrome con su cuenta de administrador:**
  1. "Mi cuenta" → "Cambiar a Administración" → abre la tabla con el Ford Ka (publicado, versión 1, 8 ítems).
  2. "Nuevo modelo": intentar `Ford` / `Ka` / 2010–2016 → tiene que rechazarlo por superposición con 2014–2014. Crear `Renault` / `Sandero` / 2015–2022.
  3. En el plan del Sandero: "Publicar" vacío → error "al menos un ítem". Agregar "Aceite y filtro de aceite", Cambiar, 10.000, 12 → publicar versión 1.
  4. Editar el intervalo del aceite a 15.000 → aparece "Borrador · versión 2" y el aviso de que la 1 sigue publicada → "Descartar borrador" → vuelve a la versión 1 con 10.000.
  5. Como propietario ("Ir a Mis vehículos" → "Agregar vehículo"): el Sandero aparece en la lista de modelos.
  6. Dejar el catálogo limpio: el Sandero queda cargado como dato de demostración (no se borra).

- [ ] **Step 2: Pull request** (con confirmación de Felipe antes del push), CI en verde y unir.

## Criterio de terminado del plan 1D

1. `npm test` (46), `npm run test:integracion` (50), `typecheck`, `lint` y `build` en verde.
2. Felipe completó el Step 1 sin errores.
3. CI en verde y PR unido a `main`.
