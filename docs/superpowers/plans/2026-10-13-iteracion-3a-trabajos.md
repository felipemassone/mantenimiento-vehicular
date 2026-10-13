# Iteración 3A — Trabajos (dominio y datos): plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Registrar, editar y eliminar trabajos (intervenciones) y consultar el historial de un vehículo (CU-10, CU-12, CU-13; RF-13, RF-14, RF-16, RF-17, RNF-07), sin pantallas.

**Architecture:** La validación es pura (`src/dominio/intervencion.ts`, pruebas unitarias). Las operaciones viven en `src/datos/intervenciones.ts`, cada una en una transacción del usuario (`conUsuario`, RLS), con la fila del vehículo bloqueada primero como en `registrarLectura`. El "reinicio del conteo" no es una escritura aparte: el motor toma la ejecución cierta de mayor km, y la intervención `registrada` lo es. No hace falta migración: la política `intervencion_dueno` ya permite al dueño todas las operaciones.

**Tech Stack:** TypeScript, Prisma 7 sobre Supabase, Vitest (proyectos `unit` e `integracion`).

**Spec:** `docs/superpowers/specs/2026-10-13-iteracion-3-registro-design.md`, apartados 3 y 6.

## Global Constraints

- Fecha obligatoria y no posterior a hoy (día de Argentina, `fechaDeHoy`); puede ser anterior al alta.
- Kilometraje obligatorio, entero mayor a 0; puede ser menor que la última lectura. Se aceptan puntos de miles ("62.400").
- Descripción libre: de 1 a 200 caracteres. Taller: opcional, hasta 120. Costo: opcional, ≥ 0, hasta 2 decimales, < 10.000.000.000; formato argentino ("85.000" o "85.000,50").
- Si el km supera la última lectura, se registra también como lectura **con la fecha del día del registro**.
- Solo se editan o eliminan intervenciones `registrada`; editar cambia fecha, km, taller y costo (no ítem ni descripción).
- Historial: `registrada` y `supuesta_confirmada`; orden por fecha descendente, luego km descendente.
- Todo en una transacción (RNF-07). Mensajes en castellano rioplatense, como los existentes.

## Review Focus

1. **Registrar un ítem que no es del plan del vehículo (de otro modelo o de un plan viejo):** se rechaza con un error en el campo, sin escribir nada (Task 2).
2. **Un registro rechazado con km mayor a la última lectura:** no deja la lectura nueva (Task 2).
3. **Eliminar el único trabajo de un ítem que tenía supuesto:** el ítem vuelve a "a confirmar" (Task 3).
4. **Editar o eliminar un supuesto, o un trabajo de otro propietario:** se rechaza sin cambios (Task 3).
5. **Costo con formatos dudosos ("85.5", "1.000.000,999", "-3"):** se rechaza con un mensaje que muestra el formato esperado (Task 1).

## Mapa de archivos

| Archivo | Responsabilidad |
|---|---|
| `src/dominio/supuestos.ts` | Exporta `leerFecha` (ya existe, se reutiliza) |
| `src/dominio/intervencion.ts` | `validarIntervencion`, `validarEdicion` |
| `src/datos/intervenciones.ts` | `registrarIntervencion`, `editarIntervencion`, `eliminarIntervencion`, `historialDelVehiculo`, `intervencionDelVehiculo` |
| `src/datos/estado.ts` | `supuestosDelVehiculo` deja afuera los ítems con un trabajo registrado |
| `tests/unit/intervencion.test.ts`, `tests/integracion/intervenciones.test.ts` | Pruebas |

## Preparación

- [ ] Con el PR de la spec (#16) mergeado: `git checkout main && git pull && git checkout -b iteracion-3a-trabajos`. Primer commit: este plan.

---

### Task 1: Validación de un trabajo

**Files:**
- Modify: `src/dominio/supuestos.ts` (exportar `leerFecha`)
- Create: `src/dominio/intervencion.ts`, `tests/unit/intervencion.test.ts`

**Interfaces:**
- Produces:
  - `type Comunes = { fecha: Date; km: number; taller: string | null; costo: string | null }` (costo como texto decimal con punto, "85000.50", para `Decimal`)
  - `type DatosIntervencion = ({ tipo: "catalogo"; itemId: number } | { tipo: "libre"; descripcion: string }) & Comunes`
  - `validarIntervencion(entrada: Record<string, unknown>, hoy: Date): { ok: true; datos: DatosIntervencion } | { ok: false; errores: ErroresCampo }`
  - `validarEdicion(entrada: Record<string, unknown>, hoy: Date): { ok: true; datos: Comunes } | { ok: false; errores: ErroresCampo }`
  - Campos de la entrada (los nombres del formulario del plan 3D): `tipo` ("catalogo" | "libre"), `itemId`, `descripcion`, `fecha` (aaaa-mm-dd), `km`, `taller`, `costo`.

- [ ] **Step 1: Prueba que falla** — `tests/unit/intervencion.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { validarEdicion, validarIntervencion } from "@/dominio/intervencion";

const hoy = new Date("2026-10-13T00:00:00Z");
const base = { tipo: "catalogo", itemId: "7", fecha: "2026-10-10", km: "62.400", taller: "", costo: "" };

describe("validarIntervencion (CU-10)", () => {
  it("un trabajo del plan con lo mínimo", () => {
    expect(validarIntervencion(base, hoy)).toEqual({
      ok: true,
      datos: { tipo: "catalogo", itemId: 7, fecha: new Date("2026-10-10T00:00:00Z"), km: 62400, taller: null, costo: null },
    });
  });
  it("un trabajo libre con taller y costo", () => {
    const r = validarIntervencion(
      { tipo: "libre", descripcion: "  Cambio de escobillas ", fecha: "2026-10-13", km: "60900", taller: " Lubri ", costo: "12.500,5" },
      hoy,
    );
    expect(r).toEqual({
      ok: true,
      datos: { tipo: "libre", descripcion: "Cambio de escobillas", fecha: hoy, km: 60900, taller: "Lubri", costo: "12500.5" },
    });
  });
  it("una fecha anterior al alta vale; una futura no", () => {
    expect(validarIntervencion({ ...base, fecha: "2019-01-01" }, hoy).ok).toBe(true);
    expect(validarIntervencion({ ...base, fecha: "2026-10-14" }, hoy)).toEqual({
      ok: false,
      errores: { fecha: "La fecha no puede ser posterior a hoy." },
    });
  });
  it("el kilometraje es obligatorio, entero y mayor a 0", () => {
    expect(validarIntervencion({ ...base, km: "" }, hoy)).toMatchObject({ errores: { km: "Ingresá el kilometraje." } });
    expect(validarIntervencion({ ...base, km: "0" }, hoy)).toMatchObject({ errores: { km: "Ingresá un kilometraje mayor a 0." } });
    expect(validarIntervencion({ ...base, km: "12,5" }, hoy)).toMatchObject({ errores: { km: "Ingresá un kilometraje válido." } });
  });
  it("tipo, ítem y descripción", () => {
    expect(validarIntervencion({ ...base, tipo: "" }, hoy)).toMatchObject({ errores: { tipo: "Elegí el tipo de trabajo." } });
    expect(validarIntervencion({ ...base, itemId: "" }, hoy)).toMatchObject({ errores: { itemId: "Elegí el trabajo del plan." } });
    expect(validarIntervencion({ ...base, tipo: "libre", descripcion: "  " }, hoy)).toMatchObject({
      errores: { descripcion: "Describí el trabajo." },
    });
    expect(validarIntervencion({ ...base, tipo: "libre", descripcion: "x".repeat(201) }, hoy)).toMatchObject({
      errores: { descripcion: "La descripción no puede superar 200 caracteres." },
    });
  });
  it("taller de hasta 120 caracteres", () => {
    expect(validarIntervencion({ ...base, taller: "x".repeat(121) }, hoy)).toMatchObject({
      errores: { taller: "El taller no puede superar 120 caracteres." },
    });
  });
  it("costo en formato argentino", () => {
    const costo = (c: string) => validarIntervencion({ ...base, costo: c }, hoy);
    expect(costo("85.000")).toMatchObject({ datos: { costo: "85000" } });
    expect(costo("$ 85.000,50")).toMatchObject({ datos: { costo: "85000.50" } });
    expect(costo("0")).toMatchObject({ datos: { costo: "0" } });
    const error = { errores: { costo: "Ingresá un costo válido, por ejemplo 85.000 o 85.000,50." } };
    expect(costo("85.5")).toMatchObject(error);
    expect(costo("1.000.000,999")).toMatchObject(error);
    expect(costo("-3")).toMatchObject(error);
    expect(costo("10.000.000.000")).toMatchObject({ errores: { costo: "El costo no puede superar $ 9.999.999.999,99." } });
  });
  it("junta todos los errores", () => {
    const r = validarIntervencion({ tipo: "catalogo", itemId: "", fecha: "", km: "" }, hoy);
    expect(r).toEqual({
      ok: false,
      errores: { itemId: "Elegí el trabajo del plan.", fecha: "Ingresá la fecha.", km: "Ingresá el kilometraje." },
    });
  });
});

describe("validarEdicion (CU-12)", () => {
  it("valida solo fecha, km, taller y costo", () => {
    expect(validarEdicion({ fecha: "2026-10-01", km: "61000", taller: "", costo: "1.500" }, hoy)).toEqual({
      ok: true,
      datos: { fecha: new Date("2026-10-01T00:00:00Z"), km: 61000, taller: null, costo: "1500" },
    });
    expect(validarEdicion({ fecha: "", km: "" }, hoy)).toEqual({
      ok: false,
      errores: { fecha: "Ingresá la fecha.", km: "Ingresá el kilometraje." },
    });
  });
});
```

- [ ] **Step 2: Verificar que falla** — `npx vitest run --project unit tests/unit/intervencion.test.ts` → FAIL (no existe el módulo).

- [ ] **Step 3: Implementación** — en `src/dominio/supuestos.ts`, cambiar `function leerFecha(` por `export function leerFecha(` (y su tipo `Fecha` por `export type Fecha`). Crear `src/dominio/intervencion.ts`:

```ts
import type { ErroresCampo } from "@/dominio/cuenta";
import { leerFecha } from "@/dominio/supuestos";

export type Comunes = { fecha: Date; km: number; taller: string | null; costo: string | null };
export type DatosIntervencion = ({ tipo: "catalogo"; itemId: number } | { tipo: "libre"; descripcion: string }) & Comunes;
type Validado<T> = { ok: true; datos: T } | { ok: false; errores: ErroresCampo };

const texto = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const COSTO_MAXIMO = 10_000_000_000;
const ERROR_COSTO = "Ingresá un costo válido, por ejemplo 85.000 o 85.000,50.";

/** "85.000,50" → "85000.50"; acepta puntos de miles bien puestos y hasta 2 decimales con coma. */
function leerCosto(valor: unknown): { ok: true; costo: string | null } | { ok: false; error: string } {
  const t = texto(valor).replace(/^\$\s*/, "");
  if (!t) return { ok: true, costo: null };
  if (!/^(\d{1,3}(\.\d{3})+|\d+)(,\d{1,2})?$/.test(t)) return { ok: false, error: ERROR_COSTO };
  const costo = t.replace(/\./g, "").replace(",", ".");
  if (Number(costo) >= COSTO_MAXIMO) return { ok: false, error: "El costo no puede superar $ 9.999.999.999,99." };
  return { ok: true, costo };
}

function leerKm(valor: unknown): { ok: true; km: number } | { ok: false; error: string } {
  const t = texto(valor).replace(/\./g, "");
  if (!t) return { ok: false, error: "Ingresá el kilometraje." };
  if (!/^\d+$/.test(t) || !Number.isSafeInteger(Number(t))) return { ok: false, error: "Ingresá un kilometraje válido." };
  if (Number(t) === 0) return { ok: false, error: "Ingresá un kilometraje mayor a 0." };
  return { ok: true, km: Number(t) };
}

/** Fecha, km, taller y costo: lo común a registrar (CU-10) y editar (CU-12). */
function validarComunes(entrada: Record<string, unknown>, hoy: Date, errores: ErroresCampo): Comunes | null {
  const f = leerFecha(entrada.fecha, hoy);
  if (!f.ok) errores.fecha = f.error;
  const k = leerKm(entrada.km);
  if (!k.ok) errores.km = k.error;
  const taller = texto(entrada.taller);
  if (taller.length > 120) errores.taller = "El taller no puede superar 120 caracteres.";
  const c = leerCosto(entrada.costo);
  if (!c.ok) errores.costo = c.error;
  return f.ok && k.ok && c.ok && taller.length <= 120
    ? { fecha: f.fecha, km: k.km, taller: taller || null, costo: c.costo }
    : null;
}

/** CU-10 pasos 3 y 4 (RF-13, RF-14). */
export function validarIntervencion(entrada: Record<string, unknown>, hoy: Date): Validado<DatosIntervencion> {
  const errores: ErroresCampo = {};
  const tipo = entrada.tipo;
  let parte: { tipo: "catalogo"; itemId: number } | { tipo: "libre"; descripcion: string } | null = null;
  if (tipo === "catalogo") {
    const id = texto(entrada.itemId);
    if (/^\d+$/.test(id) && Number(id) > 0) parte = { tipo: "catalogo", itemId: Number(id) };
    else errores.itemId = "Elegí el trabajo del plan.";
  } else if (tipo === "libre") {
    const descripcion = texto(entrada.descripcion);
    if (!descripcion) errores.descripcion = "Describí el trabajo.";
    else if (descripcion.length > 200) errores.descripcion = "La descripción no puede superar 200 caracteres.";
    else parte = { tipo: "libre", descripcion };
  } else {
    errores.tipo = "Elegí el tipo de trabajo.";
  }
  const comunes = validarComunes(entrada, hoy, errores);
  return parte && comunes ? { ok: true, datos: { ...parte, ...comunes } } : { ok: false, errores };
}

/** CU-12 paso 4: los mismos criterios que el registro, sin ítem ni descripción. */
export function validarEdicion(entrada: Record<string, unknown>, hoy: Date): Validado<Comunes> {
  const errores: ErroresCampo = {};
  const comunes = validarComunes(entrada, hoy, errores);
  return comunes ? { ok: true, datos: comunes } : { ok: false, errores };
}
```

- [ ] **Step 4: Verificar** — el mismo comando → PASS; `npm run test:cobertura` → todo en verde.

- [ ] **Step 5: Commit** — `git add src/dominio tests/unit/intervencion.test.ts` · `git commit -m "feat: validación de un trabajo (CU-10, CU-12)"`

---

### Task 2: Registrar un trabajo

**Files:**
- Create: `src/datos/intervenciones.ts`, `tests/integracion/intervenciones.test.ts`
- Modify: `src/datos/estado.ts` (`supuestosDelVehiculo`)

**Interfaces:**
- Consumes: `validarIntervencion` (Task 1); `calcularEnTx(tx, vehiculoId, hoy)` de `@/datos/estado`; `cambiosDeEstado`, `type Cambio` de `@/dominio/motor`; `fechaDeHoy`; `conUsuario`, `ClaimsUsuario`; `type Resultado` de `@/datos/vehiculos`.
- Produces: `registrarIntervencion(claims: ClaimsUsuario, vehiculoId: string, entrada: Record<string, unknown>, ahora?: Date): Promise<Resultado<{ id: string; cambios: Cambio[] }>>`.

- [ ] **Step 1: Prueba que falla** — `tests/integracion/intervenciones.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { estadoDelVehiculo, supuestosDelVehiculo } from "@/datos/estado";
import { registrarIntervencion } from "@/datos/intervenciones";
import { prismaPrivilegiado as db } from "@/datos/privilegiado";
import { crearVehiculo } from "@/datos/vehiculos";
import { fechaDeHoy } from "@/dominio/fechas";
import { sembrar } from "../../prisma/seed";
import { borrarUsuarioPrueba, claimsDe, crearUsuarioPrueba } from "./ayudantes";

let a: string;
let b: string;
let kaId: number;
let aceite: number;

const hoy = () => fechaDeHoy().toISOString().slice(0, 10);

beforeAll(async () => {
  await sembrar();
  kaId = (await db.modelo.findFirstOrThrow({ where: { nombre: "Ka", marca: { nombre: "Ford" } } })).id;
  aceite = (await db.itemMantenimiento.findFirstOrThrow({ where: { modeloId: kaId, nombre: "Aceite y filtro de aceite" } })).id;
  a = await crearUsuarioPrueba("trabajos-a");
  b = await crearUsuarioPrueba("trabajos-b");
});

afterAll(async () => {
  await borrarUsuarioPrueba(a);
  await borrarUsuarioPrueba(b);
});

async function nuevoKa(usuario: string, km = 62400): Promise<string> {
  const r = await crearVehiculo(claimsDe(usuario), { tipo: "catalogo", modeloId: kaId, anio: 2014 }, km);
  if (!r.ok) throw new Error("No se pudo crear el Ka de prueba");
  await estadoDelVehiculo(claimsDe(usuario), r.valor.id); // crea los supuestos
  return r.valor.id;
}

const filaDe = async (usuario: string, vehiculoId: string, nombre: string) =>
  (await estadoDelVehiculo(claimsDe(usuario), vehiculoId))!.items.find((i) => i.nombre === nombre)!;

describe("registrarIntervencion (CU-10)", () => {
  it("un trabajo del plan reinicia el conteo y reemplaza al supuesto (3a)", async () => {
    const id = await nuevoKa(a);
    expect((await filaDe(a, id, "Aceite y filtro de aceite")).incertidumbre).toBe("a_confirmar");
    const r = await registrarIntervencion(claimsDe(a), id, {
      tipo: "catalogo", itemId: String(aceite), fecha: hoy(), km: "62400", taller: "Lubri", costo: "85.000",
    });
    expect(r.ok).toBe(true);
    const fila = await filaDe(a, id, "Aceite y filtro de aceite");
    expect(fila).toMatchObject({ estado: "al_dia", incertidumbre: null, kmVence: 77400 });
    expect(r.ok && r.valor.cambios).toEqual([]); // seguía "al día" para el motor, solo perdió la marca
    const guardada = await db.intervencion.findFirstOrThrow({ where: { vehiculoId: id, origen: "registrada" } });
    expect(guardada).toMatchObject({ itemId: aceite, kilometraje: 62400, taller: "Lubri", descripcionLibre: null });
    expect(guardada.costo?.toString()).toBe("85000");
  });

  it("un trabajo libre queda guardado sin cambiar ningún estado (RF-14)", async () => {
    const id = await nuevoKa(a);
    const antes = await estadoDelVehiculo(claimsDe(a), id);
    const r = await registrarIntervencion(claimsDe(a), id, { tipo: "libre", descripcion: "Escobillas", fecha: hoy(), km: "62400" });
    expect(r).toMatchObject({ ok: true, valor: { cambios: [] } });
    expect(await estadoDelVehiculo(claimsDe(a), id)).toEqual(antes);
    expect(await db.intervencion.count({ where: { vehiculoId: id, origen: "registrada", itemId: null } })).toBe(1);
  });

  it("con más km que la última lectura, registra la lectura con la fecha del día (4a)", async () => {
    const id = await nuevoKa(a);
    await registrarIntervencion(claimsDe(a), id, { tipo: "libre", descripcion: "Escobillas", fecha: "2026-01-02", km: "63000" });
    const lecturas = await db.lecturaKilometraje.findMany({ where: { vehiculoId: id }, orderBy: { id: "asc" } });
    expect(lecturas.map((l) => l.kilometraje)).toEqual([62400, 63000]);
    expect(lecturas[1]!.fecha).toEqual(fechaDeHoy());
    expect((await estadoDelVehiculo(claimsDe(a), id))!.kmActual).toBe(63000);
  });

  it("con menos km que la última lectura no agrega lectura", async () => {
    const id = await nuevoKa(a);
    await registrarIntervencion(claimsDe(a), id, { tipo: "libre", descripcion: "Viejo", fecha: "2020-05-01", km: "30000" });
    expect(await db.lecturaKilometraje.count({ where: { vehiculoId: id } })).toBe(1);
  });

  it("rechaza un ítem que no es del plan del vehículo, sin escribir nada", async () => {
    const id = await nuevoKa(a);
    const ajeno = await db.itemMantenimiento.findFirstOrThrow({ where: { modeloId: { not: kaId } } });
    const r = await registrarIntervencion(claimsDe(a), id, {
      tipo: "catalogo", itemId: String(ajeno.id), fecha: hoy(), km: "70000",
    });
    expect(r).toEqual({ ok: false, errores: { itemId: "Ese trabajo no está en el plan de este vehículo." } });
    expect(await db.intervencion.count({ where: { vehiculoId: id, origen: "registrada" } })).toBe(0);
    expect(await db.lecturaKilometraje.count({ where: { vehiculoId: id } })).toBe(1);
  });

  it("un vehículo fuera del catálogo solo admite trabajos libres", async () => {
    const r = await crearVehiculo(claimsDe(a), { tipo: "libre", marca: "Peugeot", modelo: "208", anio: 2019 }, 41000);
    const id = r.ok ? r.valor.id : "";
    expect(await registrarIntervencion(claimsDe(a), id, { tipo: "catalogo", itemId: String(aceite), fecha: hoy(), km: "41000" }))
      .toEqual({ ok: false, errores: { tipo: "Este vehículo no tiene plan: elegí «Otro trabajo»." } });
    expect((await registrarIntervencion(claimsDe(a), id, { tipo: "libre", descripcion: "Aceite", fecha: hoy(), km: "41000" })).ok).toBe(true);
  });

  it("devuelve los errores de validación sin tocar la base", async () => {
    const id = await nuevoKa(a);
    expect(await registrarIntervencion(claimsDe(a), id, { tipo: "libre", descripcion: "", fecha: "", km: "" })).toEqual({
      ok: false,
      errores: { descripcion: "Describí el trabajo.", fecha: "Ingresá la fecha.", km: "Ingresá el kilometraje." },
    });
  });

  it("no registra en el vehículo de otro propietario (RLS)", async () => {
    const id = await nuevoKa(a);
    const r = await registrarIntervencion(claimsDe(b), id, { tipo: "libre", descripcion: "x", fecha: hoy(), km: "1" });
    expect(r).toEqual({ ok: false, errores: { formulario: "No encontramos el vehículo." } });
    expect(await registrarIntervencion(claimsDe(a), "no-es-un-uuid", { tipo: "libre", descripcion: "x", fecha: hoy(), km: "1" }))
      .toEqual({ ok: false, errores: { formulario: "No encontramos el vehículo." } });
  });

  it("devuelve los ítems que cambiaron de estado", async () => {
    const id = await nuevoKa(a, 74000); // aceite supuesto a 60.000 → próximo a los 74.000
    expect((await filaDe(a, id, "Aceite y filtro de aceite")).estado).toBe("proximo");
    const r = await registrarIntervencion(claimsDe(a), id, { tipo: "catalogo", itemId: String(aceite), fecha: hoy(), km: "74000" });
    expect(r.ok && r.valor.cambios).toEqual([{ itemId: aceite, nombre: "Aceite y filtro de aceite", estado: "al_dia" }]);
  });
});

describe("supuestosDelVehiculo con trabajos registrados (spec 3.1)", () => {
  it("no ofrece confirmar un ítem que ya tiene un trabajo registrado", async () => {
    const id = await nuevoKa(a);
    const antes = (await supuestosDelVehiculo(claimsDe(a), id))!.supuestos.map((s) => s.itemId);
    expect(antes).toContain(aceite);
    await registrarIntervencion(claimsDe(a), id, { tipo: "catalogo", itemId: String(aceite), fecha: hoy(), km: "62400" });
    const despues = (await supuestosDelVehiculo(claimsDe(a), id))!.supuestos.map((s) => s.itemId);
    expect(despues).not.toContain(aceite);
    expect(despues).toHaveLength(antes.length - 1);
  });
});
```

- [ ] **Step 2: Verificar que falla** — `npx vitest run --project integracion tests/integracion/intervenciones.test.ts` → FAIL (no existe `@/datos/intervenciones`).

- [ ] **Step 3: Implementación** — `src/datos/intervenciones.ts`:

```ts
import { fechaDeHoy } from "@/dominio/fechas";
import { validarIntervencion } from "@/dominio/intervencion";
import { cambiosDeEstado, type Cambio } from "@/dominio/motor";
import { conUsuario, type ClaimsUsuario, type TxUsuario } from "./cliente-usuario";
import { calcularEnTx } from "./estado";
import type { Resultado } from "./vehiculos";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NO_ENCONTRADO: Resultado<never> = { ok: false, errores: { formulario: "No encontramos el vehículo." } };

/** Bloquea el vehículo (como registrarLectura) para que dos escrituras no se crucen; false si no es del usuario. */
async function bloquear(tx: TxUsuario, vehiculoId: string): Promise<boolean> {
  const filas = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM public.vehiculo WHERE id = ${vehiculoId}::uuid FOR UPDATE`;
  return filas.length === 1;
}

/** CU-10 4a: si el km supera la última lectura, queda también como lectura, con la fecha del día. */
async function registrarLecturaSiSupera(tx: TxUsuario, vehiculoId: string, km: number, hoy: Date): Promise<void> {
  const ultima = await tx.lecturaKilometraje.findFirst({ where: { vehiculoId }, orderBy: { kilometraje: "desc" } });
  if (km > (ultima?.kilometraje ?? 0)) await tx.lecturaKilometraje.create({ data: { vehiculoId, kilometraje: km, fecha: hoy } });
}

/** CU-10 (RF-13, RF-14, RNF-07): todo en una transacción; devuelve los ítems que cambiaron de estado. */
export async function registrarIntervencion(
  claims: ClaimsUsuario,
  vehiculoId: string,
  entrada: Record<string, unknown>,
  ahora: Date = new Date(),
): Promise<Resultado<{ id: string; cambios: Cambio[] }>> {
  const hoy = fechaDeHoy(ahora);
  const v = validarIntervencion(entrada, hoy);
  if (!v.ok) return v;
  if (!UUID.test(vehiculoId)) return NO_ENCONTRADO;
  const d = v.datos;
  return conUsuario(claims, async (tx) => {
    if (!(await bloquear(tx, vehiculoId))) return NO_ENCONTRADO;
    const antes = await calcularEnTx(tx, vehiculoId, hoy);
    if (d.tipo === "catalogo") {
      if (!antes?.catalogado) return { ok: false, errores: { tipo: "Este vehículo no tiene plan: elegí «Otro trabajo»." } };
      if (!antes.items.some((i) => i.itemId === d.itemId)) {
        return { ok: false, errores: { itemId: "Ese trabajo no está en el plan de este vehículo." } };
      }
    }
    const creada = await tx.intervencion.create({
      data: {
        vehiculoId,
        origen: "registrada",
        itemId: d.tipo === "catalogo" ? d.itemId : null,
        descripcionLibre: d.tipo === "libre" ? d.descripcion : null,
        fecha: d.fecha,
        kilometraje: d.km,
        taller: d.taller,
        costo: d.costo,
      },
      select: { id: true },
    });
    await registrarLecturaSiSupera(tx, vehiculoId, d.km, hoy);
    const despues = await calcularEnTx(tx, vehiculoId, hoy);
    return { ok: true, valor: { id: creada.id, cambios: cambiosDeEstado(antes?.items ?? [], despues?.items ?? []) } };
  });
}
```

  En `src/datos/estado.ts`, dentro de `supuestosDelVehiculo`, después de leer `filas`:

```ts
    // Spec 3.1 (Iteración 3): un ítem con un trabajo registrado ya no se ofrece para confirmar.
    const conTrabajo = new Set(
      (await tx.intervencion.findMany({ where: { vehiculoId, origen: "registrada", itemId: { not: null } }, select: { itemId: true } }))
        .map((f) => f.itemId),
    );
```

  y en el `flatMap`, `return f && !conTrabajo.has(i.itemId) ? [...] : [];`.

- [ ] **Step 4: Verificar** — el mismo comando → PASS; `npx vitest run --project integracion tests/integracion/estado.test.ts` → PASS (sin regresiones); `npm run typecheck`, `npm run lint`.

- [ ] **Step 5: Commit** — `git add src tests` · `git commit -m "feat: registrar un trabajo (CU-10, RF-13, RF-14, RNF-07)"`

---

### Task 3: Editar y eliminar un trabajo

**Files:**
- Modify: `src/datos/intervenciones.ts`, `tests/integracion/intervenciones.test.ts`

**Interfaces:**
- Consumes: `validarEdicion` (Task 1); `bloquear`, `registrarLecturaSiSupera`, `NO_ENCONTRADO` (Task 2, mismo archivo).
- Produces:
  - `editarIntervencion(claims, vehiculoId: string, intervencionId: string, entrada: Record<string, unknown>, ahora?: Date): Promise<Resultado<{ cambios: Cambio[] }>>`
  - `eliminarIntervencion(claims, vehiculoId: string, intervencionId: string, ahora?: Date): Promise<Resultado<{ cambios: Cambio[]; rutaComprobante: string | null }>>` (la ruta la usa el plan 3B para borrar el archivo después de la transacción)
  - Error cuando no hay un trabajo `registrada` con ese id en ese vehículo: `{ ok: false, errores: { formulario: "Ese trabajo ya no existe. Volvé al historial." } }`

- [ ] **Step 1: Prueba que falla** — sumar a `tests/integracion/intervenciones.test.ts` (y `editarIntervencion`, `eliminarIntervencion` al import):

```ts
const SIN_TRABAJO = { ok: false, errores: { formulario: "Ese trabajo ya no existe. Volvé al historial." } };

async function conTrabajo(usuario: string) {
  const id = await nuevoKa(usuario);
  const r = await registrarIntervencion(claimsDe(usuario), id, {
    tipo: "catalogo", itemId: String(aceite), fecha: hoy(), km: "62400", taller: "Lubri", costo: "85.000",
  });
  if (!r.ok) throw new Error("No se pudo registrar el trabajo de prueba");
  return { vehiculoId: id, trabajoId: r.valor.id };
}

describe("editarIntervencion (CU-12)", () => {
  it("cambia fecha, km, taller y costo, y recalcula", async () => {
    const { vehiculoId, trabajoId } = await conTrabajo(a);
    const r = await editarIntervencion(claimsDe(a), vehiculoId, trabajoId, { fecha: hoy(), km: "61000", taller: "", costo: "" });
    expect(r.ok).toBe(true);
    expect(await db.intervencion.findUniqueOrThrow({ where: { id: trabajoId } })).toMatchObject({
      kilometraje: 61000, taller: null, costo: null, itemId: aceite,
    });
    expect((await filaDe(a, vehiculoId, "Aceite y filtro de aceite")).kmVence).toBe(76000);
  });
  it("con más km que la última lectura, también registra la lectura", async () => {
    const { vehiculoId, trabajoId } = await conTrabajo(a);
    await editarIntervencion(claimsDe(a), vehiculoId, trabajoId, { fecha: hoy(), km: "64000" });
    expect((await estadoDelVehiculo(claimsDe(a), vehiculoId))!.kmActual).toBe(64000);
  });
  it("valida como el registro", async () => {
    const { vehiculoId, trabajoId } = await conTrabajo(a);
    expect(await editarIntervencion(claimsDe(a), vehiculoId, trabajoId, { fecha: "2099-01-01", km: "1" })).toEqual({
      ok: false,
      errores: { fecha: "La fecha no puede ser posterior a hoy." },
    });
  });
  it("no edita un supuesto ni el trabajo de otro propietario", async () => {
    const { vehiculoId, trabajoId } = await conTrabajo(a);
    const supuesto = await db.intervencion.findFirstOrThrow({ where: { vehiculoId, origen: { not: "registrada" } } });
    expect(await editarIntervencion(claimsDe(a), vehiculoId, supuesto.id, { fecha: hoy(), km: "1" })).toEqual(SIN_TRABAJO);
    expect(await editarIntervencion(claimsDe(b), vehiculoId, trabajoId, { fecha: hoy(), km: "1" })).toEqual(NO_ENCONTRADO_ESPERADO);
    expect((await db.intervencion.findUniqueOrThrow({ where: { id: trabajoId } })).kilometraje).toBe(62400);
  });
});

const NO_ENCONTRADO_ESPERADO = { ok: false, errores: { formulario: "No encontramos el vehículo." } };

describe("eliminarIntervencion (CU-12 1a)", () => {
  it("borra el trabajo y el ítem vuelve a su supuesto", async () => {
    const { vehiculoId, trabajoId } = await conTrabajo(a);
    expect((await filaDe(a, vehiculoId, "Aceite y filtro de aceite")).incertidumbre).toBeNull();
    const r = await eliminarIntervencion(claimsDe(a), vehiculoId, trabajoId);
    expect(r).toMatchObject({ ok: true, valor: { rutaComprobante: null } });
    expect(await db.intervencion.count({ where: { id: trabajoId } })).toBe(0);
    expect((await filaDe(a, vehiculoId, "Aceite y filtro de aceite")).incertidumbre).toBe("a_confirmar");
    expect((await supuestosDelVehiculo(claimsDe(a), vehiculoId))!.supuestos.map((s) => s.itemId)).toContain(aceite);
  });
  it("con dos trabajos del ítem, vuelve al anterior", async () => {
    const { vehiculoId, trabajoId } = await conTrabajo(a);
    await registrarIntervencion(claimsDe(a), vehiculoId, { tipo: "catalogo", itemId: String(aceite), fecha: hoy(), km: "70000" });
    const nuevo = await db.intervencion.findFirstOrThrow({ where: { vehiculoId, origen: "registrada", kilometraje: 70000 } });
    await eliminarIntervencion(claimsDe(a), vehiculoId, nuevo.id);
    expect((await filaDe(a, vehiculoId, "Aceite y filtro de aceite")).kmVence).toBe(77400);
    expect(await db.intervencion.count({ where: { id: trabajoId } })).toBe(1);
  });
  it("devuelve la ruta del comprobante para borrar el archivo", async () => {
    const { vehiculoId, trabajoId } = await conTrabajo(a);
    await db.comprobante.create({
      data: { intervencionId: trabajoId, rutaArchivo: `${a}/prueba.jpg`, tipoMime: "image/jpeg", tamanoBytes: 1000 },
    });
    const r = await eliminarIntervencion(claimsDe(a), vehiculoId, trabajoId);
    expect(r).toMatchObject({ ok: true, valor: { rutaComprobante: `${a}/prueba.jpg` } });
    expect(await db.comprobante.count({ where: { intervencionId: trabajoId } })).toBe(0);
  });
  it("no elimina un supuesto, un id inexistente ni el trabajo de otro", async () => {
    const { vehiculoId, trabajoId } = await conTrabajo(a);
    const supuesto = await db.intervencion.findFirstOrThrow({ where: { vehiculoId, origen: { not: "registrada" } } });
    expect(await eliminarIntervencion(claimsDe(a), vehiculoId, supuesto.id)).toEqual(SIN_TRABAJO);
    expect(await eliminarIntervencion(claimsDe(a), vehiculoId, "no-es-un-uuid")).toEqual(SIN_TRABAJO);
    expect(await eliminarIntervencion(claimsDe(b), vehiculoId, trabajoId)).toEqual(NO_ENCONTRADO_ESPERADO);
    expect(await db.intervencion.count({ where: { id: trabajoId } })).toBe(1);
  });
});
```

- [ ] **Step 2: Verificar que falla** — `npx vitest run --project integracion tests/integracion/intervenciones.test.ts` → FAIL (`editarIntervencion` no existe).

- [ ] **Step 3: Implementación** — sumar a `src/datos/intervenciones.ts` (y `validarEdicion` al import de `@/dominio/intervencion`):

```ts
const SIN_TRABAJO: Resultado<never> = { ok: false, errores: { formulario: "Ese trabajo ya no existe. Volvé al historial." } };

/** CU-12: solo los trabajos registrados; el ítem y la descripción no cambian. */
export async function editarIntervencion(
  claims: ClaimsUsuario,
  vehiculoId: string,
  intervencionId: string,
  entrada: Record<string, unknown>,
  ahora: Date = new Date(),
): Promise<Resultado<{ cambios: Cambio[] }>> {
  const hoy = fechaDeHoy(ahora);
  const v = validarEdicion(entrada, hoy);
  if (!v.ok) return v;
  if (!UUID.test(vehiculoId)) return NO_ENCONTRADO;
  if (!UUID.test(intervencionId)) return SIN_TRABAJO;
  return conUsuario(claims, async (tx) => {
    if (!(await bloquear(tx, vehiculoId))) return NO_ENCONTRADO;
    const antes = await calcularEnTx(tx, vehiculoId, hoy);
    const r = await tx.intervencion.updateMany({
      where: { id: intervencionId, vehiculoId, origen: "registrada" },
      data: { fecha: v.datos.fecha, kilometraje: v.datos.km, taller: v.datos.taller, costo: v.datos.costo },
    });
    if (r.count !== 1) return SIN_TRABAJO;
    await registrarLecturaSiSupera(tx, vehiculoId, v.datos.km, hoy);
    const despues = await calcularEnTx(tx, vehiculoId, hoy);
    return { ok: true, valor: { cambios: cambiosDeEstado(antes?.items ?? [], despues?.items ?? []) } };
  });
}

/** CU-12 1a: borra el trabajo (y su comprobante, en cascada); el cálculo vuelve a la ejecución anterior. */
export async function eliminarIntervencion(
  claims: ClaimsUsuario,
  vehiculoId: string,
  intervencionId: string,
  ahora: Date = new Date(),
): Promise<Resultado<{ cambios: Cambio[]; rutaComprobante: string | null }>> {
  const hoy = fechaDeHoy(ahora);
  if (!UUID.test(vehiculoId)) return NO_ENCONTRADO;
  if (!UUID.test(intervencionId)) return SIN_TRABAJO;
  return conUsuario(claims, async (tx) => {
    if (!(await bloquear(tx, vehiculoId))) return NO_ENCONTRADO;
    const trabajo = await tx.intervencion.findFirst({
      where: { id: intervencionId, vehiculoId, origen: "registrada" },
      select: { comprobante: { select: { rutaArchivo: true } } },
    });
    if (!trabajo) return SIN_TRABAJO;
    const antes = await calcularEnTx(tx, vehiculoId, hoy);
    await tx.intervencion.delete({ where: { id: intervencionId } });
    const despues = await calcularEnTx(tx, vehiculoId, hoy);
    return {
      ok: true,
      valor: {
        cambios: cambiosDeEstado(antes?.items ?? [], despues?.items ?? []),
        rutaComprobante: trabajo.comprobante?.rutaArchivo ?? null,
      },
    };
  });
}
```

- [ ] **Step 4: Verificar** — el mismo comando → PASS; `npm run typecheck`, `npm run lint`.

- [ ] **Step 5: Commit** — `git add src tests` · `git commit -m "feat: editar y eliminar un trabajo (CU-12, RF-16)"`

---

### Task 4: Historial y detalle

**Files:**
- Modify: `src/datos/intervenciones.ts`, `tests/integracion/intervenciones.test.ts`

**Interfaces:**
- Produces:
  - `type TrabajoDelHistorial = { id: string; origen: "registrada" | "supuesta_confirmada"; fecha: Date; km: number; descripcion: string; itemId: number | null; taller: string | null; costo: string | null; tieneComprobante: boolean; editable: boolean }`
  - `historialDelVehiculo(claims, vehiculoId: string): Promise<TrabajoDelHistorial[] | null>` (null si el vehículo no es del usuario)
  - `intervencionDelVehiculo(claims, vehiculoId: string, intervencionId: string): Promise<(TrabajoDelHistorial & { rutaComprobante: string | null }) | null>`

- [ ] **Step 1: Prueba que falla** — sumar (y `historialDelVehiculo`, `intervencionDelVehiculo`, `confirmarSupuesto` de `@/datos/estado` al import):

```ts
describe("historialDelVehiculo (CU-13)", () => {
  it("trabajos registrados y supuestos confirmados, del más nuevo al más viejo; sin pendientes", async () => {
    const id = await nuevoKa(a);
    await registrarIntervencion(claimsDe(a), id, { tipo: "libre", descripcion: "Escobillas", fecha: "2026-08-02", km: "60900", costo: "12.500" });
    await registrarIntervencion(claimsDe(a), id, { tipo: "catalogo", itemId: String(aceite), fecha: "2026-10-10", km: "62400" });
    await registrarIntervencion(claimsDe(a), id, { tipo: "libre", descripcion: "Mismo día, más km", fecha: "2026-08-02", km: "61000" });
    const frenos = (await supuestosDelVehiculo(claimsDe(a), id))!.supuestos.find((s) => s.nombre === "Líquido de frenos")!;
    await confirmarSupuesto(claimsDe(a), id, frenos.itemId, "2026-01-05");

    const h = (await historialDelVehiculo(claimsDe(a), id))!;
    expect(h.map((t) => [t.descripcion, t.fecha.toISOString().slice(0, 10), t.km, t.editable])).toEqual([
      ["Aceite y filtro de aceite", "2026-10-10", 62400, true],
      ["Mismo día, más km", "2026-08-02", 61000, true],
      ["Escobillas", "2026-08-02", 60900, true],
      ["Líquido de frenos", "2026-01-05", 45000, false],
    ]);
    expect(h[2]).toMatchObject({ origen: "registrada", costo: "12500", tieneComprobante: false, itemId: null });
    expect(h[3]).toMatchObject({ origen: "supuesta_confirmada" });
  });
  it("vacío para un vehículo sin trabajos; null para uno ajeno o inexistente", async () => {
    const id = await nuevoKa(a);
    expect(await historialDelVehiculo(claimsDe(a), id)).toEqual([]);
    expect(await historialDelVehiculo(claimsDe(b), id)).toBeNull();
    expect(await historialDelVehiculo(claimsDe(a), "no-es-un-uuid")).toBeNull();
  });
});

describe("intervencionDelVehiculo", () => {
  it("trae un trabajo con su comprobante; null si es ajeno o no existe", async () => {
    const { vehiculoId, trabajoId } = await conTrabajo(a);
    await db.comprobante.create({
      data: { intervencionId: trabajoId, rutaArchivo: `${a}/f.png`, tipoMime: "image/png", tamanoBytes: 10 },
    });
    expect(await intervencionDelVehiculo(claimsDe(a), vehiculoId, trabajoId)).toMatchObject({
      descripcion: "Aceite y filtro de aceite", taller: "Lubri", costo: "85000", tieneComprobante: true, rutaComprobante: `${a}/f.png`,
    });
    expect(await intervencionDelVehiculo(claimsDe(b), vehiculoId, trabajoId)).toBeNull();
    expect(await intervencionDelVehiculo(claimsDe(a), vehiculoId, "no-es-un-uuid")).toBeNull();
  });
});
```

- [ ] **Step 2: Verificar que falla** — `npx vitest run --project integracion tests/integracion/intervenciones.test.ts` → FAIL.

- [ ] **Step 3: Implementación** — sumar a `src/datos/intervenciones.ts`:

```ts
export type TrabajoDelHistorial = {
  id: string;
  origen: "registrada" | "supuesta_confirmada";
  fecha: Date;
  km: number;
  descripcion: string;
  itemId: number | null;
  taller: string | null;
  costo: string | null;
  tieneComprobante: boolean;
  editable: boolean;
};

const SELECCION = {
  id: true,
  origen: true,
  fecha: true,
  kilometraje: true,
  itemId: true,
  descripcionLibre: true,
  taller: true,
  costo: true,
  item: { select: { nombre: true } },
  comprobante: { select: { rutaArchivo: true } },
} as const;

type Fila = {
  id: string;
  origen: string;
  fecha: Date | null;
  kilometraje: number;
  itemId: number | null;
  descripcionLibre: string | null;
  taller: string | null;
  costo: { toString(): string } | null;
  item: { nombre: string } | null;
  comprobante: { rutaArchivo: string } | null;
};

function aTrabajo(f: Fila): TrabajoDelHistorial {
  return {
    id: f.id,
    origen: f.origen as TrabajoDelHistorial["origen"],
    fecha: f.fecha!, // registradas y confirmadas siempre tienen fecha
    km: f.kilometraje,
    descripcion: f.item?.nombre ?? f.descripcionLibre ?? "",
    itemId: f.itemId,
    taller: f.taller,
    costo: f.costo?.toString() ?? null,
    tieneComprobante: f.comprobante !== null,
    editable: f.origen === "registrada",
  };
}

const DEL_HISTORIAL = { in: ["registrada", "supuesta_confirmada"] as ("registrada" | "supuesta_confirmada")[] };

/** CU-13 (RF-17): sin supuestos pendientes ni "a verificar"; null si el vehículo no es del usuario. */
export async function historialDelVehiculo(claims: ClaimsUsuario, vehiculoId: string): Promise<TrabajoDelHistorial[] | null> {
  if (!UUID.test(vehiculoId)) return null;
  return conUsuario(claims, async (tx) => {
    if (!(await tx.vehiculo.findUnique({ where: { id: vehiculoId }, select: { id: true } }))) return null;
    const filas = await tx.intervencion.findMany({
      where: { vehiculoId, origen: DEL_HISTORIAL },
      orderBy: [{ fecha: "desc" }, { kilometraje: "desc" }, { fechaRegistro: "desc" }],
      select: SELECCION,
    });
    return filas.map(aTrabajo);
  });
}

/** Detalle de un trabajo del historial (CU-13 paso 3, CU-12 paso 2). */
export async function intervencionDelVehiculo(
  claims: ClaimsUsuario,
  vehiculoId: string,
  intervencionId: string,
): Promise<(TrabajoDelHistorial & { rutaComprobante: string | null }) | null> {
  if (!UUID.test(vehiculoId) || !UUID.test(intervencionId)) return null;
  return conUsuario(claims, async (tx) => {
    const f = await tx.intervencion.findFirst({ where: { id: intervencionId, vehiculoId, origen: DEL_HISTORIAL }, select: SELECCION });
    return f ? { ...aTrabajo(f), rutaComprobante: f.comprobante?.rutaArchivo ?? null } : null;
  });
}
```

- [ ] **Step 4: Verificar** — el mismo comando → PASS; `npm run typecheck`, `npm run lint`, `npm run test:cobertura`, y la integración completa `npm run test:integracion`.

- [ ] **Step 5: Commit, PR y merge** — `git add src tests` · `git commit -m "feat: historial y detalle de los trabajos (CU-13, RF-17)"`; escaneo de secretos; push; `gh pr create --title "Iteración 3A: trabajos (dominio y datos)"`; revisión final; merge con los checks en verde (autorizado por Felipe el 12/10/2026).
