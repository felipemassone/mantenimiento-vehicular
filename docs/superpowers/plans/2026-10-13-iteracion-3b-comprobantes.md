# Iteración 3B — Comprobantes (Storage, subida y lectura): plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adjuntar, reemplazar, quitar y ver el comprobante de un trabajo (CU-11, RF-15) con subida directa del navegador a Supabase Storage, sin pantallas; y cerrar los menores que dejó el plan 3A.

**Architecture:** El bucket privado `comprobantes` y sus políticas los crea la migración `0004_registro`. El navegador valida y sube con la sesión del usuario (`src/lib/comprobantes.ts`); el formulario manda solo la ruta. En el servidor, `registrarIntervencion` y `editarIntervencion` comprueban el archivo leyendo `storage.objects` **dentro de la misma transacción del usuario** (RLS de Storage: solo ve su carpeta) y guardan la fila `comprobante`; un rechazo corta la transacción entera (clase `Rechazo`). Los archivos se borran siempre por la API de Storage (la base no deja borrar `storage.objects` directo), desde `src/datos/comprobantes.ts`, que envuelve las operaciones de 3A: si el registro falla, borra el archivo subido; si se reemplaza, quita o elimina, borra el viejo después de confirmar.

**Tech Stack:** TypeScript, Prisma 7 sobre Supabase (Postgres + Storage), `@supabase/supabase-js`, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-13-iteracion-3-registro-design.md`, apartados 4, 6 y 8.

## Global Constraints

- Bucket `comprobantes`, privado, `file_size_limit` 5242880 (5 MB), tipos `image/jpeg` e `image/png`, en dev y prod, creado por migración.
- Ruta `{usuario_id}/{uuid}.{jpg|png}`; subir, leer y borrar solo en la carpeta cuyo nombre es el `auth.uid()` de quien llama.
- El servidor comprueba que la ruta sea de la carpeta del usuario y que el archivo exista, con tipo y tamaño de los metadatos de Storage; guarda `comprobante` en la transacción del trabajo (RNF-07). Si la transacción falla, borra el archivo (postcondición de CU-11).
- Lectura con enlace firmado de **60 segundos**; la imagen nunca es pública.
- Reemplazar o quitar: se actualiza la fila y el archivo viejo se borra **después** de confirmar el cambio.
- Los huérfanos de un formulario abandonado se aceptan (spec 4); su limpieza es de la tesis final.
- Mensajes en castellano rioplatense, como los existentes. Sin pantallas (son del plan 3D).

## Decisiones de este plan (sin cambio de fondo respecto de la spec)

- **La subida ocurre al enviar el formulario, no al elegir el archivo.** La vista previa es local (`URL.createObjectURL`). Así, si el servidor rechaza el envío y borra el archivo (CU-11), el próximo envío lo vuelve a subir desde el mismo `<input type="file">`. Queda anotado para el plan 3D.
- **Nombres de campo del formulario:** `comprobante` (ruta subida) y, al editar, `quitarComprobante` = `"1"`. Sin ninguno de los dos, al editar se conserva el comprobante.
- **Un archivo pertenece a un solo trabajo:** índice único sobre `comprobante.ruta_archivo`. Antes de borrar el archivo de un envío fallido se verifica que ninguna fila lo use (`borrarSiHuerfano`): reenviar una ruta ya usada no puede dejar a otro trabajo sin su imagen.
- **Defensa en la base:** dos políticas restrictivas sobre `public.comprobante` exigen que la ruta empiece con el `auth.uid()` de quien inserta o actualiza.
- **Eliminar la cuenta (RF-04, Ley 25.326)** borra antes la carpeta del usuario en Storage: borrar el usuario de Auth no borra sus archivos.
- **Las funciones de roles (CU-18)** van en `0005_roles`, en el plan 3C: un PR por plan. La spec las agrupaba en `0004_registro`.
- **CI:** el job `integracion` aplica `prisma migrate deploy` a la base dev antes de las pruebas. Hasta ahora las migraciones de dev se aplicaban a mano; desde la red de la facultad (5432 bloqueado) no se puede, y así dev nunca queda atrás de la rama que se prueba.

## Menores del plan 3A que entran acá

1. **Km con puntos de miles mal puestos** ("62.4" → 624): `leerEnteroConMiles` exige grupos de 3 dígitos; se usa en trabajos, supuestos, vehículos y catálogo.
2. **Un registro rechazado commiteaba los supuestos que creó `calcularEnTx`:** los rechazos dentro de la transacción ahora la abortan (`Rechazo`).
3. **Falta la prueba de un ítem de un plan viejo** (versión reemplazada): se agrega.
4. **Orden del historial en SQL y no en `src/dominio/`:** `ordenarHistorial` pura, con pruebas unitarias.
5. **`texto()` trataba no-strings como vacíos:** ausente → vacío; número finito → su texto; cualquier otra cosa → inválido, con el mensaje del campo. Lo mismo en `leerFecha`.

## Review Focus

1. **Reenviar el formulario después de un rechazo** (por ejemplo, km inválido con comprobante): el archivo del envío fallido se borra y el nuevo envío sube otro; nunca queda una fila apuntando a un archivo inexistente (Task 4, prueba "un registro rechazado borra el archivo subido").
2. **Mandar la ruta de otro usuario o de otro trabajo propio:** se rechaza en el campo `comprobante` y el archivo ajeno o en uso no se borra (Task 4).
3. **Un archivo que no es JPG/PNG o pesa más de 5 MB subido sin la app:** Storage lo rechaza por la configuración del bucket (Task 3).
4. **Eliminar un trabajo o la cuenta:** no quedan archivos del usuario en el bucket (Task 4 y Task 5).
5. **Ruta propia bien formada pero sin archivo** (subida que falló a medias): se rechaza sin escribir nada, ni la lectura nueva (Task 4).

## Mapa de archivos

| Archivo | Responsabilidad |
|---|---|
| `src/dominio/kilometraje.ts` | `leerEnteroConMiles` |
| `src/dominio/intervencion.ts` | `texto` corregido, `ordenarHistorial` |
| `src/dominio/supuestos.ts`, `vehiculo.ts`, `catalogo.ts` | Usan `leerEnteroConMiles`; `leerFecha` distingue ausente de inválido |
| `src/dominio/comprobante.ts` | `BUCKET`, `validarArchivo`, `rutaDelComprobante`, `rutaPropia`, `coincideConRuta`, `leerComprobante` |
| `prisma/migrations/0004_registro/migration.sql`, `prisma/schema.prisma` | Bucket, políticas, índice único de la ruta |
| `src/datos/intervenciones.ts` | `Rechazo`, comprobante en registrar/editar, historial ordenado en dominio |
| `src/datos/comprobantes.ts` | `registrarTrabajo`, `editarTrabajo`, `eliminarTrabajo`, `enlaceDelComprobante`, `borrarCarpeta` |
| `src/lib/comprobantes.ts` | `subirComprobante` (navegador) |
| `src/app/cuenta/acciones.ts` | Borra la carpeta antes de eliminar la cuenta |
| `.github/workflows/ci.yml` | `prisma migrate deploy` en `integracion` |
| `tests/unit/*.test.ts`, `tests/integracion/comprobantes.test.ts`, `tests/integracion/intervenciones.test.ts`, `tests/integracion/ayudantes.ts` | Pruebas |

## Preparación

- [ ] `git checkout main && git pull && git checkout -b iteracion-3b-comprobantes`. Primer commit: este plan.

---

### Task 1: Menores de dominio del 3A (km, `texto`, orden del historial)

**Files:**
- Modify: `src/dominio/kilometraje.ts`, `src/dominio/intervencion.ts`, `src/dominio/supuestos.ts`, `src/dominio/vehiculo.ts`, `src/dominio/catalogo.ts`
- Test: `tests/unit/kilometraje.test.ts`, `tests/unit/intervencion.test.ts`, `tests/unit/supuestos.test.ts`, `tests/unit/vehiculo.test.ts`

**Interfaces:**
- Produces: `leerEnteroConMiles(texto: string): number | null`; `ordenarHistorial<T extends { fecha: Date; km: number; registrado: Date }>(filas: T[]): T[]` (copia ordenada: fecha desc, km desc, registro desc).

- [ ] **Step 1: Pruebas que fallan.** En `tests/unit/kilometraje.test.ts`:

```ts
describe("leerEnteroConMiles", () => {
  it("acepta el número pelado o con puntos de miles bien puestos", () => {
    expect(leerEnteroConMiles("62400")).toBe(62400);
    expect(leerEnteroConMiles(" 62.400 ")).toBe(62400);
    expect(leerEnteroConMiles("1.062.400")).toBe(1062400);
  });
  it("rechaza puntos mal puestos y lo que no es un entero", () => {
    for (const t of ["62.4", "6.2400", "1.0000", ".400", "62.", "62,4", "-1", "", "1e3"]) expect(leerEnteroConMiles(t)).toBeNull();
  });
});
```

En `tests/unit/intervencion.test.ts`:

```ts
describe("km y valores que no son texto", () => {
  const km = (v: unknown) => validarIntervencion({ ...base, km: v }, hoy);
  it("rechaza los puntos de miles mal puestos", () => {
    expect(km("62.4")).toMatchObject({ ok: false, errores: { km: "Ingresá un kilometraje válido." } });
  });
  it("acepta un número", () => {
    expect(km(62400)).toMatchObject({ ok: true, datos: { km: 62400 } });
  });
  it("un valor que no es texto ni número es inválido, no vacío", () => {
    expect(km({})).toMatchObject({ ok: false, errores: { km: "Ingresá un kilometraje válido." } });
    expect(validarIntervencion({ ...base, taller: ["x"] }, hoy)).toMatchObject({ ok: false, errores: { taller: "Ingresá un taller válido." } });
    expect(validarIntervencion({ ...base, costo: true }, hoy)).toMatchObject({ ok: false, errores: { costo: expect.stringContaining("85.000") } });
    expect(validarIntervencion({ ...base, fecha: 20261010 }, hoy)).toMatchObject({ ok: false, errores: { fecha: "Ingresá una fecha válida." } });
  });
});

describe("ordenarHistorial (CU-13)", () => {
  const t = (id: string, fecha: string, km: number, registrado = "2026-10-13T10:00:00Z") => ({
    id, fecha: new Date(fecha), km, registrado: new Date(registrado),
  });
  it("fecha descendente, después km descendente, después el registrado último", () => {
    const filas = [
      t("viejo", "2025-01-10", 40000),
      t("mismo-dia-menos-km", "2026-10-10", 62000),
      t("nuevo", "2026-10-11", 62500),
      t("mismo-dia-mas-km", "2026-10-10", 62400),
      t("empate-primero", "2026-10-10", 62000, "2026-10-13T09:00:00Z"),
    ];
    expect(ordenarHistorial(filas).map((f) => f.id)).toEqual([
      "nuevo", "mismo-dia-mas-km", "mismo-dia-menos-km", "empate-primero", "viejo",
    ]);
    expect(filas[0].id).toBe("viejo"); // no modifica la entrada
  });
});
```

En `tests/unit/supuestos.test.ts`, dentro de `validarCorreccion`:

```ts
it("rechaza puntos de miles mal puestos", () => {
  expect(validarCorreccion({ km: "50.0", fecha: "2026-01-10", kmActual: 62400, hoy })).toMatchObject({
    ok: false, errores: { km: "Ingresá un kilometraje válido." },
  });
});
```

En `tests/unit/vehiculo.test.ts`:

```ts
it("rechaza un kilometraje con puntos de miles mal puestos", () => {
  const r = parsearVehiculo({ tipo: "catalogo", modeloId: "3", anio: "2014", kilometraje: "62.4" }, true);
  expect(r).toMatchObject({ ok: false, errores: { kilometraje: "Ingresá un kilometraje válido." } });
});
```

- [ ] **Step 2:** `npx vitest run --project unit` → fallan las nuevas (`leerEnteroConMiles`/`ordenarHistorial` no existen, "62.4" aceptado).

- [ ] **Step 3: Implementación.** `src/dominio/kilometraje.ts`:

```ts
/** "62.400" o "62400" → 62400. Null si no es un entero o los puntos de miles están mal puestos ("62.4"). */
export function leerEnteroConMiles(texto: string): number | null {
  const t = texto.trim();
  if (!/^(\d{1,3}(\.\d{3})+|\d+)$/.test(t)) return null;
  const n = Number(t.replace(/\./g, ""));
  return Number.isSafeInteger(n) ? n : null;
}
```

`src/dominio/intervencion.ts`:

```ts
/** Ausente → ""; texto → recortado; número finito → su texto; cualquier otra cosa → null (inválido). */
const texto = (v: unknown): string | null =>
  v === undefined || v === null
    ? ""
    : typeof v === "string"
      ? v.trim()
      : typeof v === "number" && Number.isFinite(v)
        ? String(v)
        : null;

function leerCosto(valor: unknown) {
  const t0 = texto(valor);
  if (t0 === null) return { ok: false, error: ERROR_COSTO } as const;
  const t = t0.replace(/^\$\s*/, "");
  // …igual que antes
}

function leerKm(valor: unknown) {
  const t = texto(valor);
  if (t === "") return { ok: false, error: "Ingresá el kilometraje." } as const;
  const km = t === null ? null : leerEnteroConMiles(t);
  if (km === null || km > KM_MAXIMO) return { ok: false, error: "Ingresá un kilometraje válido." } as const;
  if (km === 0) return { ok: false, error: "Ingresá un kilometraje mayor a 0." } as const;
  return { ok: true, km } as const;
}
// taller: null → "Ingresá un taller válido."; descripcion: null → "Ingresá una descripción válida."; itemId: null → "Elegí el trabajo del plan."

/** CU-13: fecha descendente; a igual fecha, km descendente; a igual km, el último registrado primero. */
export function ordenarHistorial<T extends { fecha: Date; km: number; registrado: Date }>(filas: T[]): T[] {
  return [...filas].sort(
    (a, b) => b.fecha.getTime() - a.fecha.getTime() || b.km - a.km || b.registrado.getTime() - a.registrado.getTime(),
  );
}
```

`leerFecha` (`supuestos.ts`): `undefined`/`null`/`""` → "Ingresá la fecha."; otro tipo que no sea string → "Ingresá una fecha válida.". `validarCorreccion`: `const km = typeof entrada.km === "string" ? (leerEnteroConMiles(entrada.km) ?? NaN) : NaN;`. En `vehiculo.ts` y `catalogo.ts`, el preprocesado pasa a `v.trim() === "" ? undefined : (leerEnteroConMiles(v) ?? NaN)`.

- [ ] **Step 4:** `npx vitest run --project unit` → todo en verde; `npm run typecheck && npm run lint`.
- [ ] **Step 5: Commit** — `fix: puntos de miles mal puestos, valores que no son texto y orden del historial en el dominio`.

---

### Task 2: Reglas del comprobante (dominio)

**Files:**
- Create: `src/dominio/comprobante.ts`, `tests/unit/comprobante.test.ts`

**Interfaces:**
- Produces:
  - `BUCKET = "comprobantes"`, `TAMANO_MAXIMO = 5 * 1024 * 1024`, `type TipoComprobante = "image/jpeg" | "image/png"`
  - `validarArchivo(a: { tipo: string; tamano: number }): { ok: true; tipo: TipoComprobante } | { ok: false; error: string }`
  - `rutaDelComprobante(usuarioId: string, id: string, tipo: TipoComprobante): string`
  - `rutaPropia(ruta: unknown, usuarioId: string): string | null`
  - `coincideConRuta(ruta: string, tipo: TipoComprobante): boolean`
  - `type CambioComprobante = { accion: "mantener" } | { accion: "quitar" } | { accion: "poner"; ruta: string }`
  - `leerComprobante(entrada: Record<string, unknown>, usuarioId: string): { ok: true; cambio: CambioComprobante } | { ok: false; error: string }`

- [ ] **Step 1: Prueba que falla** — `tests/unit/comprobante.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  coincideConRuta, leerComprobante, rutaDelComprobante, rutaPropia, TAMANO_MAXIMO, validarArchivo,
} from "@/dominio/comprobante";

const yo = "6f1c2a7e-1111-4222-8333-944455556666";
const otro = "0a0b0c0d-1111-4222-8333-944455556666";
const archivo = "1d2e3f40-aaaa-4bbb-8ccc-dddddddddddd";

describe("validarArchivo (CU-11 2a)", () => {
  it("acepta JPG y PNG hasta 5 MB", () => {
    expect(validarArchivo({ tipo: "image/jpeg", tamano: 1 })).toEqual({ ok: true, tipo: "image/jpeg" });
    expect(validarArchivo({ tipo: "image/png", tamano: TAMANO_MAXIMO })).toEqual({ ok: true, tipo: "image/png" });
  });
  it("rechaza otros tipos, archivos vacíos y más de 5 MB", () => {
    expect(validarArchivo({ tipo: "application/pdf", tamano: 10 })).toEqual({ ok: false, error: "El comprobante tiene que ser una imagen JPG o PNG." });
    expect(validarArchivo({ tipo: "toString", tamano: 10 })).toMatchObject({ ok: false });
    expect(validarArchivo({ tipo: "image/png", tamano: 0 })).toEqual({ ok: false, error: "El archivo está vacío." });
    expect(validarArchivo({ tipo: "image/png", tamano: TAMANO_MAXIMO + 1 })).toEqual({ ok: false, error: "El comprobante no puede superar 5 MB." });
  });
});

describe("rutas", () => {
  it("arma {usuario}/{id}.{ext}", () => {
    expect(rutaDelComprobante(yo, archivo, "image/jpeg")).toBe(`${yo}/${archivo}.jpg`);
    expect(rutaDelComprobante(yo, archivo, "image/png")).toBe(`${yo}/${archivo}.png`);
  });
  it("rutaPropia acepta solo rutas bien formadas de la carpeta de quien la manda", () => {
    expect(rutaPropia(`${yo}/${archivo}.png`, yo)).toBe(`${yo}/${archivo}.png`);
    for (const r of [`${otro}/${archivo}.png`, `${yo}/${archivo}.gif`, `${yo}/../${otro}/${archivo}.png`, `${yo}/x.png`, 42, null]) {
      expect(rutaPropia(r, yo)).toBeNull();
    }
  });
  it("coincideConRuta compara la extensión con el tipo real", () => {
    expect(coincideConRuta(`${yo}/${archivo}.png`, "image/png")).toBe(true);
    expect(coincideConRuta(`${yo}/${archivo}.jpg`, "image/png")).toBe(false);
  });
});

describe("leerComprobante", () => {
  it("sin campos, se mantiene; con quitarComprobante, se quita; con ruta, se pone", () => {
    expect(leerComprobante({}, yo)).toEqual({ ok: true, cambio: { accion: "mantener" } });
    expect(leerComprobante({ comprobante: "" }, yo)).toEqual({ ok: true, cambio: { accion: "mantener" } });
    expect(leerComprobante({ quitarComprobante: "1" }, yo)).toEqual({ ok: true, cambio: { accion: "quitar" } });
    expect(leerComprobante({ comprobante: `${yo}/${archivo}.jpg` }, yo)).toEqual({ ok: true, cambio: { accion: "poner", ruta: `${yo}/${archivo}.jpg` } });
  });
  it("una ruta ajena o mal formada es un error del campo", () => {
    expect(leerComprobante({ comprobante: `${otro}/${archivo}.jpg` }, yo)).toEqual({ ok: false, error: "No pudimos usar ese comprobante. Volvé a adjuntarlo." });
  });
});
```

- [ ] **Step 2:** `npx vitest run --project unit tests/unit/comprobante.test.ts` → falla (módulo inexistente).

- [ ] **Step 3: Implementación** — `src/dominio/comprobante.ts`:

```ts
/** Bucket privado de Supabase Storage (spec 4). */
export const BUCKET = "comprobantes";
/** RF-15: 5 MB, igual que el límite del bucket y la restricción comprobante_tamano. */
export const TAMANO_MAXIMO = 5 * 1024 * 1024;

const EXTENSION = { "image/jpeg": "jpg", "image/png": "png" } as const;
export type TipoComprobante = keyof typeof EXTENSION;

export type CambioComprobante = { accion: "mantener" } | { accion: "quitar" } | { accion: "poner"; ruta: string };

/** CU-11 2a: antes de subir, y otra vez en el servidor con los metadatos de Storage. */
export function validarArchivo(a: { tipo: string; tamano: number }): { ok: true; tipo: TipoComprobante } | { ok: false; error: string } {
  if (!Object.hasOwn(EXTENSION, a.tipo)) return { ok: false, error: "El comprobante tiene que ser una imagen JPG o PNG." };
  if (!Number.isInteger(a.tamano) || a.tamano <= 0) return { ok: false, error: "El archivo está vacío." };
  if (a.tamano > TAMANO_MAXIMO) return { ok: false, error: "El comprobante no puede superar 5 MB." };
  return { ok: true, tipo: a.tipo as TipoComprobante };
}

/** {usuario}/{id}.{jpg|png}: la carpeta es lo que miran las políticas de Storage. */
export function rutaDelComprobante(usuarioId: string, id: string, tipo: TipoComprobante): string {
  return `${usuarioId}/${id}.${EXTENSION[tipo]}`;
}

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const RUTA = new RegExp(`^(${UUID})/${UUID}\\.(jpg|png)$`);

/** La ruta que manda el formulario, solo si está bien formada y en la carpeta de quien la manda. */
export function rutaPropia(ruta: unknown, usuarioId: string): string | null {
  if (typeof ruta !== "string") return null;
  const m = RUTA.exec(ruta);
  return m && m[1] === usuarioId ? ruta : null;
}

export function coincideConRuta(ruta: string, tipo: TipoComprobante): boolean {
  return ruta.endsWith(`.${EXTENSION[tipo]}`);
}

/** Campos `comprobante` (ruta subida) y `quitarComprobante` ("1") del formulario de un trabajo. */
export function leerComprobante(
  entrada: Record<string, unknown>,
  usuarioId: string,
): { ok: true; cambio: CambioComprobante } | { ok: false; error: string } {
  const ruta = entrada.comprobante;
  if (ruta !== undefined && ruta !== null && ruta !== "") {
    const propia = rutaPropia(ruta, usuarioId);
    return propia
      ? { ok: true, cambio: { accion: "poner", ruta: propia } }
      : { ok: false, error: "No pudimos usar ese comprobante. Volvé a adjuntarlo." };
  }
  return { ok: true, cambio: entrada.quitarComprobante === "1" ? { accion: "quitar" } : { accion: "mantener" } };
}
```

- [ ] **Step 4:** `npx vitest run --project unit` → verde.
- [ ] **Step 5: Commit** — `feat: reglas del comprobante (CU-11, RF-15)`.

---

### Task 3: Bucket y políticas (migración 0004 y CI)

**Files:**
- Create: `prisma/migrations/0004_registro/migration.sql`, `tests/integracion/comprobantes.test.ts`
- Modify: `prisma/schema.prisma` (`rutaArchivo @unique(map: "comprobante_ruta_unica")`), `.github/workflows/ci.yml`, `tests/integracion/ayudantes.ts`

**Interfaces:**
- Produces (ayudantes de prueba): `sesionDe(id: string): Promise<SupabaseClient>` (cliente con la sesión del usuario de prueba); `borrarUsuarioPrueba` borra además su carpeta del bucket; `pngDe(bytes?: number): Blob`.

- [ ] **Step 1: Prueba que falla** — `tests/integracion/comprobantes.test.ts` (primer bloque):

```ts
describe("bucket comprobantes (spec 4)", () => {
  it("es privado, con 5 MB y JPG/PNG", async () => {
    const { data } = await supabaseAdmin().storage.getBucket(BUCKET);
    expect(data).toMatchObject({ public: false, file_size_limit: 5242880, allowed_mime_types: ["image/jpeg", "image/png"] });
  });
  it("Storage rechaza otro tipo o más de 5 MB aunque no se use la app", async () => {
    const c = await sesionDe(a);
    const pdf = await c.storage.from(BUCKET).upload(`${a}/${randomUUID()}.png`, new Blob(["%PDF"]), { contentType: "application/pdf" });
    expect(pdf.error).not.toBeNull();
    const grande = await c.storage.from(BUCKET).upload(`${a}/${randomUUID()}.png`, pngDe(TAMANO_MAXIMO + 1), { contentType: "image/png" });
    expect(grande.error).not.toBeNull();
  });
  it("cada uno sube, lee y borra solo en su carpeta", async () => {
    const ca = await sesionDe(a);
    const cb = await sesionDe(b);
    const ruta = `${a}/${randomUUID()}.png`;
    expect((await ca.storage.from(BUCKET).upload(ruta, pngDe(), { contentType: "image/png" })).error).toBeNull();
    expect((await cb.storage.from(BUCKET).upload(`${a}/${randomUUID()}.png`, pngDe(), { contentType: "image/png" })).error).not.toBeNull();
    expect((await cb.storage.from(BUCKET).createSignedUrl(ruta, 60)).error).not.toBeNull();
    await cb.storage.from(BUCKET).remove([ruta]);
    expect(await existe(ruta)).toBe(true);
    expect((await ca.storage.from(BUCKET).remove([ruta])).data).toHaveLength(1);
    expect(await existe(ruta)).toBe(false);
  });
});
```

Con `existe(ruta)` = `SELECT 1 FROM storage.objects WHERE bucket_id = 'comprobantes' AND name = ruta` por `prismaPrivilegiado.$queryRaw`.

- [ ] **Step 2: Migración** — `prisma/migrations/0004_registro/migration.sql`:

```sql
-- Iteración 3, plan 3B (spec, apartado 4): comprobantes en Supabase Storage.
-- En una transacción: si Supabase no deja crear algo, no queda nada a medias.
BEGIN;

-- Bucket privado. El límite y los tipos los aplica Storage aunque alguien no use la app (RF-15).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('comprobantes', 'comprobantes', false, 5242880, ARRAY['image/jpeg', 'image/png'])
ON CONFLICT (id) DO UPDATE
  SET public = false, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Cada usuario sube, lee y borra solo en la carpeta con su id. Sin UPDATE: un archivo no se
-- pisa; reemplazar un comprobante es subir otro y borrar el viejo.
CREATE POLICY comprobantes_subir ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'comprobantes' AND (storage.foldername(name))[1] = (SELECT auth.uid()::text));
CREATE POLICY comprobantes_leer ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'comprobantes' AND (storage.foldername(name))[1] = (SELECT auth.uid()::text));
CREATE POLICY comprobantes_borrar ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'comprobantes' AND (storage.foldername(name))[1] = (SELECT auth.uid()::text));

-- Un archivo pertenece a un solo trabajo: borrar uno no puede dejar a otro sin su imagen.
CREATE UNIQUE INDEX comprobante_ruta_unica ON public.comprobante (ruta_archivo);

-- Además de comprobante_dueno: la fila solo puede apuntar a la carpeta de quien la escribe.
CREATE POLICY comprobante_ruta_propia_alta ON public.comprobante AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (split_part(ruta_archivo, '/', 1) = (SELECT auth.uid()::text));
CREATE POLICY comprobante_ruta_propia_cambio ON public.comprobante AS RESTRICTIVE FOR UPDATE TO authenticated
  WITH CHECK (split_part(ruta_archivo, '/', 1) = (SELECT auth.uid()::text));

COMMIT;
```

- [ ] **Step 3: CI** — en el job `integracion`, antes de `npm run test:integracion`:

```yaml
      # La base dev sigue a la rama que se prueba (las migraciones son aditivas).
      - run: npx prisma migrate deploy
```

- [ ] **Step 4: Aplicar.** Desde casa: `npx prisma migrate deploy` → "Applying migration `0004_registro`". Desde la facultad (5432 bloqueado), lo aplica el CI al empujar la rama. **Si Supabase no deja crear el bucket o las políticas con el rol de Prisma**: el CI muestra el error, la migración queda marcada como fallida (P3009); se resuelve con `npx prisma migrate resolve --rolled-back 0004_registro`, se crean bucket y políticas desde el panel (Storage → New bucket; Storage → Policies, con las mismas expresiones) y la migración queda solo con el índice y las políticas de `public.comprobante`. Anotarlo en el README.
- [ ] **Step 5:** pruebas de integración del bloque → verde (en CI si no hay acceso a la base).
- [ ] **Step 6: Commit** — `feat: bucket privado de comprobantes con políticas por carpeta (RF-15)`.

---

### Task 4: Comprobante en registrar, editar y eliminar (datos)

**Files:**
- Modify: `src/datos/intervenciones.ts`
- Create: `src/datos/comprobantes.ts`, `src/lib/comprobantes.ts`
- Test: `tests/integracion/comprobantes.test.ts`, `tests/integracion/intervenciones.test.ts`

**Interfaces:**
- Consumes: Task 2 (`leerComprobante`, `validarArchivo`, `coincideConRuta`, `rutaPropia`, `BUCKET`), Task 1 (`ordenarHistorial`).
- Produces:
  - `registrarIntervencion(claims, vehiculoId, entrada, ahora?)` acepta `entrada.comprobante`.
  - `editarIntervencion(...)` acepta `comprobante`/`quitarComprobante` y devuelve `{ cambios: Cambio[]; rutaAnterior: string | null }`.
  - `TrabajoDelHistorial` suma `registrado: Date`.
  - `src/datos/comprobantes.ts`:
    - `registrarTrabajo(claims, cliente: SupabaseClient, vehiculoId, entrada, ahora?)` → igual que `registrarIntervencion`
    - `editarTrabajo(claims, cliente, vehiculoId, intervencionId, entrada, ahora?)` → igual que `editarIntervencion`
    - `eliminarTrabajo(claims, cliente, vehiculoId, intervencionId, ahora?)` → `Resultado<{ cambios: Cambio[] }>`
    - `enlaceDelComprobante(cliente, ruta): Promise<string | null>` (60 s)
    - `borrarCarpeta(cliente, usuarioId): Promise<boolean>`
  - `src/lib/comprobantes.ts`: `subirComprobante(cliente, usuarioId, archivo: Blob): Promise<{ ok: true; ruta: string } | { ok: false; error: string }>`
  - El `cliente` es el de la sesión del usuario: en las acciones del plan 3D, `await createClient()` de `@/lib/supabase/server`.

- [ ] **Step 1: Pruebas que fallan** — `tests/integracion/comprobantes.test.ts`:

```ts
describe("comprobante de un trabajo (CU-11)", () => {
  it("se sube, se guarda con tipo y tamaño de Storage y se ve con un enlace de 60 s", async () => {
    const id = await nuevoKa(a);
    const ca = await sesionDe(a);
    const s = await subirComprobante(ca, a, pngDe(200));
    expect(s.ok).toBe(true);
    const r = await registrarTrabajo(claimsDe(a), ca, id, { ...aceite(), comprobante: s.ok && s.ruta });
    expect(r.ok).toBe(true);
    const fila = await db.comprobante.findFirstOrThrow({ where: { intervencion: { vehiculoId: id } } });
    expect(fila).toMatchObject({ rutaArchivo: s.ok && s.ruta, tipoMime: "image/png", tamanoBytes: 200 });
    const [t] = (await historialDelVehiculo(claimsDe(a), id))!;
    expect(t.tieneComprobante).toBe(true);
    const url = await enlaceDelComprobante(ca, fila.rutaArchivo);
    expect(url).toMatch(/token=/);
    const resp = await fetch(url!);
    expect(resp.status).toBe(200);
    expect(resp.headers.get("content-type")).toBe("image/png");
  });

  it("subirComprobante valida antes de subir (2a)", async () => {
    const ca = await sesionDe(a);
    expect(await subirComprobante(ca, a, new Blob(["x"], { type: "application/pdf" }))).toEqual({
      ok: false, error: "El comprobante tiene que ser una imagen JPG o PNG.",
    });
  });

  it("un registro rechazado no escribe nada y borra el archivo subido (RNF-07)", async () => {
    const id = await nuevoKa(a);
    const ca = await sesionDe(a);
    const s = await subirComprobante(ca, a, pngDe());
    const ruta = s.ok ? s.ruta : "";
    const r = await registrarTrabajo(claimsDe(a), ca, id, { ...aceite(), km: "99.0", comprobante: ruta });
    expect(r).toMatchObject({ ok: false, errores: { km: "Ingresá un kilometraje válido." } });
    expect(await existe(ruta)).toBe(false);
  });

  it("una ruta propia sin archivo se rechaza sin escribir el trabajo ni la lectura", async () => {
    const id = await nuevoKa(a);
    const r = await registrarTrabajo(claimsDe(a), await sesionDe(a), id, {
      ...aceite(), km: "70000", comprobante: `${a}/${randomUUID()}.png`,
    });
    expect(r).toMatchObject({ ok: false, errores: { comprobante: "No encontramos el comprobante. Volvé a adjuntarlo." } });
    expect(await db.intervencion.count({ where: { vehiculoId: id, origen: "registrada" } })).toBe(0);
    expect(await db.lecturaKilometraje.count({ where: { vehiculoId: id, kilometraje: 70000 } })).toBe(0);
  });

  it("la ruta de otro usuario se rechaza y su archivo no se toca", async () => {
    const cb = await sesionDe(b);
    const ajena = await subirComprobante(cb, b, pngDe());
    const ruta = ajena.ok ? ajena.ruta : "";
    const id = await nuevoKa(a);
    const r = await registrarTrabajo(claimsDe(a), await sesionDe(a), id, { ...aceite(), comprobante: ruta });
    expect(r).toMatchObject({ ok: false, errores: { comprobante: "No pudimos usar ese comprobante. Volvé a adjuntarlo." } });
    expect(await existe(ruta)).toBe(true);
  });

  it("una ruta que ya usa otro trabajo se rechaza y el archivo sigue", async () => {
    const id = await nuevoKa(a);
    const ca = await sesionDe(a);
    const s = await subirComprobante(ca, a, pngDe());
    const ruta = s.ok ? s.ruta : "";
    expect((await registrarTrabajo(claimsDe(a), ca, id, { ...aceite(), comprobante: ruta })).ok).toBe(true);
    const otra = await registrarTrabajo(claimsDe(a), ca, id, { ...libre(), comprobante: ruta });
    expect(otra).toMatchObject({ ok: false, errores: { comprobante: "Ese comprobante ya está en otro trabajo." } });
    expect(await existe(ruta)).toBe(true);
  });

  it("reemplazar borra el archivo viejo; quitar borra la fila y el archivo; un cambio rechazado conserva el viejo", async () => {
    const id = await nuevoKa(a);
    const ca = await sesionDe(a);
    const s1 = await subirComprobante(ca, a, pngDe());
    const r = await registrarTrabajo(claimsDe(a), ca, id, { ...aceite(), comprobante: s1.ok && s1.ruta });
    const trabajo = r.ok ? r.valor.id : "";
    const s2 = await subirComprobante(ca, a, pngDe());
    const fallida = await editarTrabajo(claimsDe(a), ca, id, trabajo, { ...comunes(), km: "abc", comprobante: s2.ok && s2.ruta });
    expect(fallida.ok).toBe(false);
    expect(await existe(s1.ok ? s1.ruta : "")).toBe(true);
    expect(await existe(s2.ok ? s2.ruta : "")).toBe(false);
    const s3 = await subirComprobante(ca, a, pngDe());
    expect((await editarTrabajo(claimsDe(a), ca, id, trabajo, { ...comunes(), comprobante: s3.ok && s3.ruta })).ok).toBe(true);
    expect(await existe(s1.ok ? s1.ruta : "")).toBe(false);
    expect((await db.comprobante.findFirstOrThrow({ where: { intervencionId: trabajo } })).rutaArchivo).toBe(s3.ok && s3.ruta);
    expect((await editarTrabajo(claimsDe(a), ca, id, trabajo, { ...comunes(), quitarComprobante: "1" })).ok).toBe(true);
    expect(await db.comprobante.count({ where: { intervencionId: trabajo } })).toBe(0);
    expect(await existe(s3.ok ? s3.ruta : "")).toBe(false);
  });

  it("eliminar el trabajo borra el comprobante y su archivo", async () => {
    const id = await nuevoKa(a);
    const ca = await sesionDe(a);
    const s = await subirComprobante(ca, a, pngDe());
    const r = await registrarTrabajo(claimsDe(a), ca, id, { ...aceite(), comprobante: s.ok && s.ruta });
    expect((await eliminarTrabajo(claimsDe(a), ca, id, r.ok ? r.valor.id : "")).ok).toBe(true);
    expect(await existe(s.ok ? s.ruta : "")).toBe(false);
  });

  it("la base no deja guardar una fila que apunte a la carpeta de otro", async () => {
    const id = await nuevoKa(a);
    const r = await registrarTrabajo(claimsDe(a), await sesionDe(a), id, aceite());
    const intento = conUsuario(claimsDe(a), (tx) =>
      tx.comprobante.create({ data: { intervencionId: r.ok ? r.valor.id : "", rutaArchivo: `${b}/${randomUUID()}.png`, tipoMime: "image/png", tamanoBytes: 10 } }),
    );
    await expect(intento).rejects.toThrow();
  });

  it("borrarCarpeta deja vacía la carpeta del usuario (RF-04)", async () => {
    const c = await sesionDe(c3);
    for (let i = 0; i < 3; i++) await subirComprobante(c, c3, pngDe());
    expect(await borrarCarpeta(c, c3)).toBe(true);
    expect((await supabaseAdmin().storage.from(BUCKET).list(c3)).data).toEqual([]);
  });
});
```

Ayudantes del archivo: `aceite()` = `{ tipo: "catalogo", itemId: String(aceiteId), fecha: hoy(), km: "62400" }`, `libre()` = `{ tipo: "libre", descripcion: "Escobillas", fecha: hoy(), km: "62400" }`, `comunes()` = `{ fecha: hoy(), km: "62400" }`, `nuevoKa` como en `intervenciones.test.ts`.

En `tests/integracion/intervenciones.test.ts` (menores 2 y 3):

```ts
it("un registro rechazado no deja los supuestos que creó el cálculo", async () => {
  const r0 = await crearVehiculo(claimsDe(a), { tipo: "catalogo", modeloId: kaId, anio: 2014 }, 62400);
  const id = r0.ok ? r0.valor.id : "";
  expect(await db.intervencion.count({ where: { vehiculoId: id } })).toBe(0);
  const r = await registrarIntervencion(claimsDe(a), id, { tipo: "catalogo", itemId: "999999", fecha: hoy(), km: "62400" });
  expect(r).toMatchObject({ ok: false, errores: { itemId: "Ese trabajo no está en el plan de este vehículo." } });
  expect(await db.intervencion.count({ where: { vehiculoId: id } })).toBe(0);
});

it("un ítem de una versión vieja del plan se rechaza", async () => {
  // Modelo propio de la prueba: plan v1 (reemplazado) con dos ítems, v2 (publicado) con uno.
  const { modeloId, itemViejo } = await modeloConPlanViejo();
  const r0 = await crearVehiculo(claimsDe(a), { tipo: "catalogo", modeloId, anio: 2020 }, 1000);
  const id = r0.ok ? r0.valor.id : "";
  const r = await registrarIntervencion(claimsDe(a), id, { tipo: "catalogo", itemId: String(itemViejo), fecha: hoy(), km: "1000" });
  expect(r).toMatchObject({ ok: false, errores: { itemId: "Ese trabajo no está en el plan de este vehículo." } });
});
```

`modeloConPlanViejo()` crea con `prismaPrivilegiado` una marca "Prueba plan viejo {uuid}", un modelo, dos ítems, el plan v1 con los dos (`estado: "reemplazado"`) y el v2 con uno (`estado: "publicado"`); `afterAll` borra la marca (y en cascada lo demás, después de borrar los usuarios).

- [ ] **Step 2:** Las pruebas fallan (módulos inexistentes; el supuesto rechazado se commitea).

- [ ] **Step 3: `src/datos/intervenciones.ts`.**

```ts
/** Un rechazo dentro de la transacción la aborta: no queda nada, ni los supuestos que creó calcularEnTx. */
class Rechazo extends Error {
  constructor(readonly resultado: Resultado<never>) {
    super("rechazo");
  }
}
const rechazar = (errores: ErroresCampo): never => {
  throw new Rechazo({ ok: false, errores });
};

async function enTransaccion<T>(claims: ClaimsUsuario, fn: (tx: TxUsuario) => Promise<Resultado<T>>): Promise<Resultado<T>> {
  try {
    return await conUsuario(claims, fn);
  } catch (e) {
    if (e instanceof Rechazo) return e.resultado;
    throw e;
  }
}

const SIN_ARCHIVO = "No encontramos el comprobante. Volvé a adjuntarlo.";

/** CU-11: el archivo tiene que estar en Storage (la RLS solo deja ver la carpeta propia) y cumplir tipo y tamaño. */
async function guardarComprobante(tx: TxUsuario, intervencionId: string, ruta: string): Promise<void> {
  const [archivo] = await tx.$queryRaw<{ tipo: string | null; tamano: string | null }[]>`
    SELECT metadata->>'mimetype' AS tipo, metadata->>'size' AS tamano
    FROM storage.objects WHERE bucket_id = ${BUCKET} AND name = ${ruta}`;
  if (!archivo) rechazar({ comprobante: SIN_ARCHIVO });
  const v = validarArchivo({ tipo: archivo.tipo ?? "", tamano: Number(archivo.tamano) });
  if (!v.ok) rechazar({ comprobante: v.error });
  if (!coincideConRuta(ruta, v.tipo)) rechazar({ comprobante: SIN_ARCHIVO });
  const enUso = await tx.comprobante.findUnique({ where: { rutaArchivo: ruta }, select: { intervencionId: true } });
  if (enUso && enUso.intervencionId !== intervencionId) rechazar({ comprobante: "Ese comprobante ya está en otro trabajo." });
  const datos = { rutaArchivo: ruta, tipoMime: v.tipo, tamanoBytes: Number(archivo.tamano), fechaCarga: new Date() };
  await tx.comprobante.upsert({ where: { intervencionId }, create: { intervencionId, ...datos }, update: datos });
}
```

`registrarIntervencion`: lee `leerComprobante(entrada, claims.sub)` antes de abrir la transacción (error → `{ comprobante }`), usa `enTransaccion` y `rechazar` para el ítem y el plan, y después de crear la intervención, si `cambio.accion === "poner"`, `await guardarComprobante(tx, creada.id, cambio.ruta)` **antes** de registrar la lectura. `editarIntervencion`: igual; después del `updateMany`, lee el comprobante actual; con `poner` y una ruta distinta guarda el nuevo y `rutaAnterior` = la vieja; con `quitar` borra la fila y `rutaAnterior` = la vieja. Devuelve `{ cambios, rutaAnterior }`. `eliminarIntervencion` pasa a `enTransaccion`. `historialDelVehiculo` selecciona `fechaRegistro`, quita el `orderBy` y devuelve `ordenarHistorial(filas.map(aTrabajo))`, con `registrado: f.fechaRegistro` en `aTrabajo`.

- [ ] **Step 4: `src/datos/comprobantes.ts`.**

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { BUCKET, rutaPropia } from "@/dominio/comprobante";
import type { Cambio } from "@/dominio/motor";
import { conUsuario, type ClaimsUsuario } from "./cliente-usuario";
import { editarIntervencion, eliminarIntervencion, registrarIntervencion } from "./intervenciones";
import type { Resultado } from "./vehiculos";

/**
 * Archivos del bucket, siempre con la sesión del usuario (la RLS de Storage limita a su carpeta).
 * La base no deja borrar storage.objects directo: se borra por la API. Un error no corta la
 * operación: el archivo queda huérfano en la carpeta del usuario (límite aceptado, spec 4).
 */
async function borrarArchivos(cliente: SupabaseClient, rutas: string[]): Promise<void> {
  if (rutas.length === 0) return;
  const { error } = await cliente.storage.from(BUCKET).remove(rutas);
  if (error) console.error(`[comprobantes] no se pudieron borrar ${rutas.length} archivos: ${error.message}`);
}

/** El archivo de un envío fallido se borra solo si ningún trabajo lo usa (un reenvío no deja a otro sin imagen). */
async function borrarSiHuerfano(claims: ClaimsUsuario, cliente: SupabaseClient, ruta: string | null): Promise<void> {
  if (!ruta) return;
  const enUso = await conUsuario(claims, (tx) => tx.comprobante.findUnique({ where: { rutaArchivo: ruta }, select: { id: true } }));
  if (!enUso) await borrarArchivos(cliente, [ruta]);
}

/** CU-10 con CU-11: si el trabajo no se guarda, el archivo subido se borra (postcondición de CU-11). */
export async function registrarTrabajo(
  claims: ClaimsUsuario,
  cliente: SupabaseClient,
  vehiculoId: string,
  entrada: Record<string, unknown>,
  ahora: Date = new Date(),
): Promise<Resultado<{ id: string; cambios: Cambio[] }>> {
  const ruta = rutaPropia(entrada.comprobante, claims.sub);
  try {
    const r = await registrarIntervencion(claims, vehiculoId, entrada, ahora);
    if (!r.ok) await borrarSiHuerfano(claims, cliente, ruta);
    return r;
  } catch (e) {
    await borrarSiHuerfano(claims, cliente, ruta);
    throw e;
  }
}

/** CU-12 con CU-11: el archivo viejo se borra después de confirmar el cambio. */
export async function editarTrabajo(
  claims: ClaimsUsuario,
  cliente: SupabaseClient,
  vehiculoId: string,
  intervencionId: string,
  entrada: Record<string, unknown>,
  ahora: Date = new Date(),
): Promise<Resultado<{ cambios: Cambio[]; rutaAnterior: string | null }>> {
  const ruta = rutaPropia(entrada.comprobante, claims.sub);
  try {
    const r = await editarIntervencion(claims, vehiculoId, intervencionId, entrada, ahora);
    if (r.ok && r.valor.rutaAnterior) await borrarArchivos(cliente, [r.valor.rutaAnterior]);
    if (!r.ok) await borrarSiHuerfano(claims, cliente, ruta);
    return r;
  } catch (e) {
    await borrarSiHuerfano(claims, cliente, ruta);
    throw e;
  }
}

/** CU-12 1a: la fila del comprobante se va en cascada; el archivo, después. */
export async function eliminarTrabajo(
  claims: ClaimsUsuario,
  cliente: SupabaseClient,
  vehiculoId: string,
  intervencionId: string,
  ahora: Date = new Date(),
): Promise<Resultado<{ cambios: Cambio[] }>> {
  const r = await eliminarIntervencion(claims, vehiculoId, intervencionId, ahora);
  if (!r.ok) return r;
  if (r.valor.rutaComprobante) await borrarArchivos(cliente, [r.valor.rutaComprobante]);
  return { ok: true, valor: { cambios: r.valor.cambios } };
}

/** CU-13 paso 3: enlace firmado de 60 segundos; la imagen nunca es pública (RF-15). */
export async function enlaceDelComprobante(cliente: SupabaseClient, ruta: string): Promise<string | null> {
  const { data, error } = await cliente.storage.from(BUCKET).createSignedUrl(ruta, 60);
  return error ? null : data.signedUrl;
}

/** RF-04: borrar el usuario de Auth no borra sus archivos; se vacía la carpeta antes. */
export async function borrarCarpeta(cliente: SupabaseClient, usuarioId: string): Promise<boolean> {
  for (;;) {
    const { data, error } = await cliente.storage.from(BUCKET).list(usuarioId, { limit: 100 });
    if (error) return false;
    if (data.length === 0) return true;
    const borrados = await cliente.storage.from(BUCKET).remove(data.map((o) => `${usuarioId}/${o.name}`));
    // Sin error pero sin borrar nada (la RLS lo impidió): cortar en vez de repetir para siempre.
    if (borrados.error || borrados.data.length === 0) return false;
  }
}
```

- [ ] **Step 5: `src/lib/comprobantes.ts`.**

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { BUCKET, rutaDelComprobante, validarArchivo } from "@/dominio/comprobante";

/**
 * CU-11 en el navegador: valida (2a), sube con la sesión del usuario y devuelve la ruta que manda
 * el formulario. Se llama al enviar, no al elegir: si el servidor rechaza el envío, borra el
 * archivo, y el próximo envío lo vuelve a subir.
 */
export async function subirComprobante(
  cliente: SupabaseClient,
  usuarioId: string,
  archivo: Blob,
): Promise<{ ok: true; ruta: string } | { ok: false; error: string }> {
  const v = validarArchivo({ tipo: archivo.type, tamano: archivo.size });
  if (!v.ok) return v;
  const ruta = rutaDelComprobante(usuarioId, crypto.randomUUID(), v.tipo);
  const { error } = await cliente.storage.from(BUCKET).upload(ruta, archivo, { contentType: v.tipo, upsert: false });
  return error ? { ok: false, error: "No pudimos subir el comprobante. Probá de nuevo." } : { ok: true, ruta };
}
```

- [ ] **Step 6:** `npm run typecheck && npm run lint && npx vitest run --project unit`; integración en verde (local desde casa o en CI).
- [ ] **Step 7: Commit** — `feat: comprobante de un trabajo en Storage (CU-11, RF-15, RNF-07)`.

---

### Task 5: Eliminar la cuenta borra los archivos, documentación y cierre

**Files:**
- Modify: `src/app/cuenta/acciones.ts`, `README.md`, `docs/cambios-para-el-informe.md`

- [ ] **Step 1:** en `eliminarCuenta`, después de verificar la contraseña y antes de `deleteUser`:

```ts
  const supabase = await createClient();
  // RF-04: borrar el usuario de Auth no borra sus archivos de Storage.
  if (!(await borrarCarpeta(supabase, claims.sub))) return { error: "No pudimos eliminar la cuenta. Intentá de nuevo en unos minutos." };
```

(el mismo `supabase` se usa después para `signOut`). La prueba de `borrarCarpeta` está en la Task 4; la acción la recorre la e2e del plan 3E.

- [ ] **Step 2: README** — en "Base de datos": el CI aplica las migraciones a dev en el job `integracion`; el bucket `comprobantes` lo crea `0004_registro` (y, si hubo que hacerlo desde el panel, cómo).
- [ ] **Step 3: `docs/cambios-para-el-informe.md`** — sección "Iteración 3": RF-15 (subida directa a Storage, enlace firmado de 60 s, límite y tipos en el bucket), CU-11 (el archivo se sube al guardar; si falla se borra), RF-04 (la eliminación de la cuenta también borra los comprobantes).
- [ ] **Step 4:** `npm run typecheck && npm run lint && npm run test:cobertura`; empujar, abrir el PR, esperar los tres checks y mergear en verde.
- [ ] **Step 5:** Producción: el próximo despliegue de `main` aplica `0004_registro`; verificar con la API de Storage (clave secreta de prod) que el bucket existe y es privado.
