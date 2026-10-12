# Iteración 2B — Datos del estado y supuestos: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** La capa de datos del motor: calcular el estado de un vehículo con RLS y guardar los supuestos que falten (CU-14), las tres respuestas de CU-06, los cambios de estado al actualizar el kilometraje (CU-08 paso 7) y la migración con el índice de supuestos y el trigger del odómetro.

**Architecture:** `src/datos/estado.ts` arma la entrada del motor dentro de una transacción `conUsuario` (RLS), inserta los supuestos faltantes con `createMany({ skipDuplicates: true })` (un `ON CONFLICT DO NOTHING` que respeta el índice único parcial) y devuelve el resultado de `calcularEstado`. Las validaciones de CU-06 son puras, en `src/dominio/supuestos.ts`. La migración `0003_motor` es SQL propio, como las anteriores.

**Tech Stack:** Prisma 7 vía `conUsuario`, PostgreSQL (Supabase), Vitest (unitarias e integración contra Supabase de desarrollo).

**Spec:** `docs/superpowers/specs/2026-10-12-iteracion-2-motor-design.md`, apartados 3.1 (supuestos), 4.2 (datos), 4.3 (migración), 5 (validaciones de CU-06) y 6 (pruebas).

## Global Constraints

- Las páginas y acciones no importan Prisma: todo pasa por `src/datos` con `conUsuario` (RLS). `prismaPrivilegiado` solo en pruebas.
- La fecha del día se normaliza en la capa de datos con `fechaDeHoy(ahora)`, aunque quien llame pase un instante con hora (revisión 2A, menor diferida). `fechaAlta` del vehículo (timestamptz) también se pasa al motor como día argentino.
- Un solo supuesto por vehículo e ítem, también ante consultas simultáneas (índice único parcial).
- Mensajes de CU-06 (mockup 13): "No puede superar 62.400 km, la lectura actual." · "La fecha no puede ser posterior a hoy." · "Ingresá la fecha." · "Ingresá un kilometraje válido."
- La migración se aplica a desarrollo con `npx prisma migrate deploy`; a producción la aplica el build de Vercel en el próximo despliegue.

## Review Focus

1. **El vehículo de otro usuario:** `estadoDelVehiculo` y las tres respuestas de CU-06 con el id de un vehículo ajeno tienen que comportarse como "no existe", sin escribir supuestos en él (Task 3 y 4).
2. **Un modelo cuyo plan publicado cambia de versión con ítems nuevos:** los ítems agregados reciben su supuesto en la próxima consulta (Task 3).
3. **Confirmar dos veces el mismo supuesto** (doble toque): la segunda vez no puede pisar la fecha ya confirmada (Task 4).
4. **`ahora` con hora del día:** el 31/12 a las 21 h de Argentina (00 h UTC del 01/01) cuenta como 31/12 (Task 3).
5. **Una lectura menor insertada por fuera de la aplicación:** la base la rechaza aunque no pase por `registrarLectura` (Task 1).

## Mapa de archivos

| Archivo | Responsabilidad |
|---|---|
| `prisma/migrations/0003_motor/migration.sql` | Índice único parcial de supuestos; trigger del odómetro |
| `src/datos/cliente-usuario.ts` | Más margen de espera en las transacciones |
| `src/dominio/supuestos.ts` | `validarConfirmacion`, `validarCorreccion` |
| `src/datos/estado.ts` | `calcularEnTx`, `estadoDelVehiculo`, `resumenesDeMisVehiculos`, `supuestosDelVehiculo`, `confirmarSupuesto`, `corregirSupuesto`, `marcarAVerificar` |
| `src/datos/vehiculos.ts` | `crearVehiculo` asegura supuestos y avisa si los creó; `registrarLectura` devuelve los cambios de estado |
| `src/app/(propietario)/vehiculos/acciones.ts` | Se adapta a los nuevos valores de retorno |
| `tests/unit/supuestos.test.ts`, `tests/integracion/estado.test.ts`, `tests/integracion/restricciones.test.ts` | Pruebas |
| `README.md`, spec | Limitación de las vistas previas con los correos |

## Preparación

- [ ] `git checkout main && git pull && git checkout -b iteracion-2b-datos`. Primer commit: este plan.

---

### Task 1: Migración 0003 y margen de las transacciones

**Files:**
- Create: `prisma/migrations/0003_motor/migration.sql`
- Modify: `src/datos/cliente-usuario.ts`, `tests/integracion/restricciones.test.ts`

- [ ] **Step 1: Prueba que falla** — agregar al final de `tests/integracion/restricciones.test.ts` (usa los ayudantes y `db` que el archivo ya importa; si no importa `crearVehiculo` ni `claimsDe`, sumarlos):

```ts
describe("odómetro en la base (RF-07, migración 0003)", () => {
  it("rechaza una lectura menor aunque se inserte por fuera de la aplicación", async () => {
    const u = await crearUsuarioPrueba("odometro");
    try {
      const ka = await db.modelo.findFirstOrThrow({ where: { nombre: "Ka", marca: { nombre: "Ford" } } });
      const v = await db.vehiculo.create({
        data: { usuarioId: u, modeloId: ka.id, anio: 2014, lecturas: { create: { kilometraje: 50_000, fecha: new Date() } } },
      });
      await expect(
        db.lecturaKilometraje.create({ data: { vehiculoId: v.id, kilometraje: 49_000, fecha: new Date() } }),
      ).rejects.toThrow(/menor que la última/);
      await expect(
        db.lecturaKilometraje.create({ data: { vehiculoId: v.id, kilometraje: 50_000, fecha: new Date() } }),
      ).resolves.toBeTruthy();
    } finally {
      await borrarUsuarioPrueba(u);
    }
  });

  it("no admite dos supuestos para el mismo vehículo e ítem", async () => {
    const u = await crearUsuarioPrueba("supuesto-unico");
    try {
      const ka = await db.modelo.findFirstOrThrow({ where: { nombre: "Ka", marca: { nombre: "Ford" } } });
      const item = await db.itemMantenimiento.findFirstOrThrow({ where: { modeloId: ka.id, nombre: "Aceite y filtro de aceite" } });
      const v = await db.vehiculo.create({ data: { usuarioId: u, modeloId: ka.id, anio: 2014 } });
      const supuesto = { vehiculoId: v.id, itemId: item.id, origen: "supuesta_pendiente" as const, kilometraje: 60_000 };
      await db.intervencion.create({ data: supuesto });
      await expect(db.intervencion.create({ data: { ...supuesto, origen: "supuesta_a_verificar" } })).rejects.toThrow();
      // Las intervenciones registradas no tienen ese límite.
      await db.intervencion.create({ data: { ...supuesto, origen: "registrada", fecha: new Date() } });
      await db.intervencion.create({ data: { ...supuesto, origen: "registrada", fecha: new Date() } });
    } finally {
      await borrarUsuarioPrueba(u);
    }
  });
});
```

- [ ] **Step 2: Verificar que falla** — `npx vitest run --project integracion tests/integracion/restricciones.test.ts` → las dos pruebas nuevas fallan (la lectura menor se acepta; el segundo supuesto se acepta).

- [ ] **Step 3: Migración** — `prisma/migrations/0003_motor/migration.sql`:

```sql
-- Iteración 2 (spec, apartado 4.3).

-- Un solo supuesto por vehículo e ítem: dos cálculos simultáneos no pueden duplicarlo.
CREATE UNIQUE INDEX intervencion_un_supuesto_por_item
  ON public.intervencion (vehiculo_id, item_id)
  WHERE origen IN ('supuesta_pendiente', 'supuesta_confirmada', 'supuesta_a_verificar');

-- RF-07 en la base: una lectura no puede ser menor que la máxima del vehículo.
-- Bloquea la fila del vehículo para que dos inserciones simultáneas no se salteen la regla.
CREATE FUNCTION public.validar_lectura_no_decreciente() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE
  maxima integer;
BEGIN
  PERFORM 1 FROM public.vehiculo WHERE id = NEW.vehiculo_id FOR UPDATE;
  SELECT max(kilometraje) INTO maxima FROM public.lectura_kilometraje WHERE vehiculo_id = NEW.vehiculo_id;
  IF maxima IS NOT NULL AND NEW.kilometraje < maxima THEN
    RAISE EXCEPTION 'La lectura % es menor que la última registrada (%)', NEW.kilometraje, maxima
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER lectura_no_decreciente
  BEFORE INSERT ON public.lectura_kilometraje
  FOR EACH ROW EXECUTE FUNCTION public.validar_lectura_no_decreciente();
```

- [ ] **Step 4: Aplicar en desarrollo** — `npx prisma migrate deploy` → "Applying migration `0003_motor`" y "All migrations have been successfully applied".

- [ ] **Step 5: Margen de las transacciones** — en `src/datos/cliente-usuario.ts`, la llamada `prisma.$transaction(async (tx) => { … })` pasa a recibir opciones, con su comentario:

```ts
  // Más margen que los valores por defecto de Prisma (2 s y 5 s): por el pooler, abrir la
  // transacción puede tardar más de 2 s en una red lenta ("Unable to start a transaction").
  return prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT set_config('request.jwt.claims', ${JSON.stringify(claims)}, true)`;
      await tx.$executeRawUnsafe("SET LOCAL ROLE authenticated");
      return fn(tx);
    },
    { maxWait: 10_000, timeout: 15_000 },
  );
```

- [ ] **Step 6: Verificar** — `npx vitest run --project integracion tests/integracion/restricciones.test.ts` → pasan todas. `npm run test:integracion` → todas en verde (las 50 de antes + 2).

- [ ] **Step 7: Commit** — `git add prisma/migrations/0003_motor src/datos/cliente-usuario.ts tests/integracion/restricciones.test.ts` · `git commit -m "feat: migración 0003 (un supuesto por ítem, odómetro en la base) y margen de las transacciones"`

---

### Task 2: Validaciones de CU-06

**Files:**
- Create: `src/dominio/supuestos.ts`, `tests/unit/supuestos.test.ts`

**Interfaces:**
- Produces: `validarConfirmacion(entrada: { fecha: unknown; hoy: Date }): { ok: true; fecha: Date } | { ok: false; errores: ErroresCampo }` y `validarCorreccion(entrada: { km: unknown; fecha: unknown; kmActual: number; hoy: Date }): { ok: true; km: number; fecha: Date } | { ok: false; errores: ErroresCampo }`. `fecha` llega como texto `aaaa-mm-dd` (input de fecha); `km` como texto con o sin puntos de miles.

- [ ] **Step 1: Prueba que falla** — `tests/unit/supuestos.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { validarConfirmacion, validarCorreccion } from "@/dominio/supuestos";

const hoy = new Date("2026-10-12T00:00:00Z");

describe("validarConfirmacion (CU-06 paso 2)", () => {
  it("acepta una fecha hasta hoy", () => {
    expect(validarConfirmacion({ fecha: "2026-03-10", hoy })).toEqual({ ok: true, fecha: new Date("2026-03-10T00:00:00Z") });
    expect(validarConfirmacion({ fecha: "2026-10-12", hoy }).ok).toBe(true);
  });
  it("exige la fecha", () => {
    expect(validarConfirmacion({ fecha: "", hoy })).toEqual({ ok: false, errores: { fecha: "Ingresá la fecha." } });
  });
  it("rechaza una fecha posterior a hoy (2d)", () => {
    expect(validarConfirmacion({ fecha: "2026-10-13", hoy })).toEqual({
      ok: false,
      errores: { fecha: "La fecha no puede ser posterior a hoy." },
    });
  });
  it("rechaza una fecha mal formada", () => {
    expect(validarConfirmacion({ fecha: "10/03/2026", hoy }).ok).toBe(false);
    expect(validarConfirmacion({ fecha: "2026-02-30", hoy }).ok).toBe(false);
  });
});

describe("validarCorreccion (CU-06 2a)", () => {
  it("acepta km hasta la lectura actual, con puntos de miles", () => {
    expect(validarCorreccion({ km: "58.000", fecha: "2026-05-02", kmActual: 62_400, hoy })).toEqual({
      ok: true,
      km: 58_000,
      fecha: new Date("2026-05-02T00:00:00Z"),
    });
  });
  it("rechaza km mayores a la lectura actual (2d)", () => {
    expect(validarCorreccion({ km: "63000", fecha: "2026-05-02", kmActual: 62_400, hoy })).toEqual({
      ok: false,
      errores: { km: "No puede superar 62.400 km, la lectura actual." },
    });
  });
  it("rechaza km no válidos y junta los errores de los dos campos", () => {
    expect(validarCorreccion({ km: "abc", fecha: "", kmActual: 62_400, hoy })).toEqual({
      ok: false,
      errores: { km: "Ingresá un kilometraje válido.", fecha: "Ingresá la fecha." },
    });
  });
});
```

- [ ] **Step 2: Verificar que falla** — `npx vitest run --project unit tests/unit/supuestos.test.ts` → FAIL (no existe el módulo).

- [ ] **Step 3: Implementación** — `src/dominio/supuestos.ts`:

```ts
import type { ErroresCampo } from "@/dominio/cuenta";
import { formatearKm } from "@/dominio/kilometraje";

type Fecha = { ok: true; fecha: Date } | { ok: false; error: string };

/** Fecha de un input type="date" (aaaa-mm-dd), como día calendario en medianoche UTC. */
function leerFecha(valor: unknown, hoy: Date): Fecha {
  const texto = typeof valor === "string" ? valor.trim() : "";
  if (!texto) return { ok: false, error: "Ingresá la fecha." };
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto);
  const fecha = m ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))) : null;
  if (!fecha || fecha.toISOString().slice(0, 10) !== texto) return { ok: false, error: "Ingresá una fecha válida." };
  if (fecha.getTime() > hoy.getTime()) return { ok: false, error: "La fecha no puede ser posterior a hoy." };
  return { ok: true, fecha };
}

/** CU-06 paso 2: confirmar el supuesto exige la fecha (decisión del 4/10/2026). */
export function validarConfirmacion(entrada: { fecha: unknown; hoy: Date }):
  | { ok: true; fecha: Date }
  | { ok: false; errores: ErroresCampo } {
  const f = leerFecha(entrada.fecha, entrada.hoy);
  return f.ok ? { ok: true, fecha: f.fecha } : { ok: false, errores: { fecha: f.error } };
}

/** CU-06 2a y 2d: km y fecha reales; el km no puede superar la lectura actual. */
export function validarCorreccion(entrada: { km: unknown; fecha: unknown; kmActual: number; hoy: Date }):
  | { ok: true; km: number; fecha: Date }
  | { ok: false; errores: ErroresCampo } {
  const texto = typeof entrada.km === "string" ? entrada.km.replace(/\./g, "").trim() : "";
  const km = /^\d+$/.test(texto) ? Number(texto) : NaN;
  const errores: ErroresCampo = {};
  if (!Number.isSafeInteger(km)) errores.km = "Ingresá un kilometraje válido.";
  else if (km > entrada.kmActual) errores.km = `No puede superar ${formatearKm(entrada.kmActual)} km, la lectura actual.`;
  const f = leerFecha(entrada.fecha, entrada.hoy);
  if (!f.ok) errores.fecha = f.error;
  return Object.keys(errores).length > 0 || !f.ok ? { ok: false, errores } : { ok: true, km, fecha: f.fecha };
}
```

- [ ] **Step 4: Verificar** — `npx vitest run --project unit tests/unit/supuestos.test.ts` → 7 pasan. `npm run typecheck`, `npm run lint` limpios.

- [ ] **Step 5: Commit** — `git add src/dominio/supuestos.ts tests/unit/supuestos.test.ts` · `git commit -m "feat: validaciones de la confirmación de supuestos (CU-06)"`

---

### Task 3: Estado del vehículo con supuestos guardados

**Files:**
- Create: `src/datos/estado.ts`, `tests/integracion/estado.test.ts`

**Interfaces:**
- Consumes: `calcularEstado`, `supuestosFaltantes`, `resumen`, tipos `EntradaMotor`, `ItemConEstado`, `Ejecucion` de `@/dominio/motor`; `fechaDeHoy` de `@/dominio/fechas`.
- Produces:
  - `type EstadoVehiculo = { catalogado: boolean; kmActual: number; items: ItemConEstado[] }`
  - `calcularEnTx(tx: TxUsuario, vehiculoId: string, hoy: Date): Promise<EstadoVehiculo | null>` (asegura supuestos; null si el vehículo no existe o no es del usuario)
  - `estadoDelVehiculo(claims: ClaimsUsuario, vehiculoId: string, ahora?: Date): Promise<EstadoVehiculo | null>`
  - `resumenesDeMisVehiculos(claims: ClaimsUsuario, ahora?: Date): Promise<Record<string, ReturnType<typeof resumen> | null>>` (null para los fuera del catálogo)

- [ ] **Step 1: Pruebas que fallan** — `tests/integracion/estado.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { estadoDelVehiculo, resumenesDeMisVehiculos } from "@/datos/estado";
import { crearVehiculo } from "@/datos/vehiculos";
import { prismaPrivilegiado as db } from "@/datos/privilegiado";
import { sembrar } from "../../prisma/seed";
import { borrarUsuarioPrueba, claimsDe, crearUsuarioPrueba } from "./ayudantes";

let a: string;
let b: string;
let kaId: number;

beforeAll(async () => {
  await sembrar();
  kaId = (await db.modelo.findFirstOrThrow({ where: { nombre: "Ka", marca: { nombre: "Ford" } } })).id;
  a = await crearUsuarioPrueba("estado-a");
  b = await crearUsuarioPrueba("estado-b");
});

afterAll(async () => {
  await borrarUsuarioPrueba(a);
  await borrarUsuarioPrueba(b);
});

async function nuevoKa(usuario: string, km: number): Promise<string> {
  const r = await crearVehiculo(claimsDe(usuario), { tipo: "catalogo", modeloId: kaId, anio: 2014 }, km);
  if (!r.ok) throw new Error("No se pudo crear el Ka de prueba");
  return r.valor.id;
}

const supuestosDe = (vehiculoId: string) =>
  db.intervencion.count({ where: { vehiculoId, origen: { in: ["supuesta_pendiente", "supuesta_a_verificar"] } } });

describe("estadoDelVehiculo (CU-09, CU-14)", () => {
  it("calcula los 8 ítems del Ka y guarda los 6 supuestos de un auto cargado con 62.400 km", async () => {
    const id = await nuevoKa(a, 62_400);
    const e = await estadoDelVehiculo(claimsDe(a), id);
    expect(e?.catalogado).toBe(true);
    expect(e?.kmActual).toBe(62_400);
    expect(e?.items).toHaveLength(8);
    expect(e?.items.filter((i) => i.incertidumbre === "a_confirmar")).toHaveLength(6);
    expect(await supuestosDe(id)).toBe(6);
  });

  it("no duplica los supuestos al consultar varias veces, ni en simultáneo", async () => {
    const id = await nuevoKa(a, 62_400);
    await Promise.all([1, 2, 3].map(() => estadoDelVehiculo(claimsDe(a), id)));
    await estadoDelVehiculo(claimsDe(a), id);
    expect(await supuestosDe(id)).toBe(6);
  });

  it("un auto nuevo no recibe supuestos", async () => {
    const id = await nuevoKa(a, 500);
    const e = await estadoDelVehiculo(claimsDe(a), id);
    expect(e?.items.every((i) => i.incertidumbre === null && i.estado === "al_dia")).toBe(true);
    expect(await supuestosDe(id)).toBe(0);
  });

  it("un modelo fuera del catálogo no tiene ítems", async () => {
    const r = await crearVehiculo(claimsDe(a), { tipo: "libre", marca: "Peugeot", modelo: "208", anio: 2019 }, 41_000);
    if (!r.ok) throw new Error("alta");
    expect(await estadoDelVehiculo(claimsDe(a), r.valor.id)).toEqual({ catalogado: false, kmActual: 41_000, items: [] });
  });

  it("el vehículo de otro usuario no existe para él y no recibe supuestos", async () => {
    const id = await db.vehiculo
      .create({ data: { usuarioId: a, modeloId: kaId, anio: 2014, lecturas: { create: { kilometraje: 62_400, fecha: new Date() } } } })
      .then((v) => v.id);
    expect(await estadoDelVehiculo(claimsDe(b), id)).toBeNull();
    expect(await supuestosDe(id)).toBe(0);
  });

  it("un id mal formado devuelve null", async () => {
    expect(await estadoDelVehiculo(claimsDe(a), "no-es-un-uuid")).toBeNull();
  });

  it("un ítem agregado al plan publicado recibe su supuesto en la próxima consulta", async () => {
    const id = await nuevoKa(a, 62_400);
    await estadoDelVehiculo(claimsDe(a), id);
    const plan = await db.planMantenimiento.findFirstOrThrow({ where: { modeloId: kaId, estado: "publicado" } });
    const item = await db.itemMantenimiento.create({ data: { modeloId: kaId, nombre: `Filtro de prueba ${Date.now()}`, tipo: "reemplazo" } });
    await db.intervaloPlan.create({ data: { planId: plan.id, itemId: item.id, intervaloKm: 30_000 } });
    try {
      const e = await estadoDelVehiculo(claimsDe(a), id);
      expect(e?.items).toHaveLength(9);
      expect(await supuestosDe(id)).toBe(7);
    } finally {
      await db.intervencion.deleteMany({ where: { itemId: item.id } });
      await db.intervaloPlan.delete({ where: { planId_itemId: { planId: plan.id, itemId: item.id } } });
      await db.itemMantenimiento.delete({ where: { id: item.id } });
    }
  });

  it("un instante con hora se toma como el día de Argentina", async () => {
    const id = await nuevoKa(a, 500);
    // 01/01/2027 00:30 UTC = 31/12/2026 21:30 en Buenos Aires
    const conHora = await estadoDelVehiculo(claimsDe(a), id, new Date("2027-01-01T00:30:00Z"));
    const dia = await estadoDelVehiculo(claimsDe(a), id, new Date("2026-12-31T12:00:00Z"));
    // El margen por fecha depende del día: sin normalizar, el 01/01 UTC daría un día menos.
    expect(conHora?.items.map((i) => i.margen)).toEqual(dia?.items.map((i) => i.margen));
  });
});

describe("resumenesDeMisVehiculos (mockup 04)", () => {
  it("resume cada vehículo del usuario, con null para los que no están en el catálogo", async () => {
    const u = await crearUsuarioPrueba("resumen");
    try {
      const ka = (await crearVehiculo(claimsDe(u), { tipo: "catalogo", modeloId: kaId, anio: 2014 }, 62_400)) as {
        ok: true;
        valor: { id: string };
      };
      const libre = (await crearVehiculo(claimsDe(u), { tipo: "libre", marca: "Fiat", modelo: "Uno", anio: 2010 }, 90_000)) as {
        ok: true;
        valor: { id: string };
      };
      const r = await resumenesDeMisVehiculos(claimsDe(u));
      expect(r[ka.valor.id]).toEqual({ vencidos: 0, proximos: 0, inciertos: 6 });
      expect(r[libre.valor.id]).toBeNull();
    } finally {
      await borrarUsuarioPrueba(u);
    }
  });
});
```

Nota: estas pruebas usan `crearVehiculo` con su valor nuevo `{ id, conSupuestos }` (Task 5). Hasta la Task 5, el primer paso de la Task 3 adapta `crearVehiculo` lo mínimo: `return { ok: true, valor: { id: v.id, conSupuestos: false } }`, y actualiza la acción `agregarVehiculo` para redirigir a `/vehiculos/${r.valor.id}`. La Task 5 completa `conSupuestos`.

- [ ] **Step 2: Adaptar el alta** — en `src/datos/vehiculos.ts`, `crearVehiculo` pasa a devolver `Promise<Resultado<{ id: string; conSupuestos: boolean }>>` con `valor: { id: v.id, conSupuestos: false }`; en `src/app/(propietario)/vehiculos/acciones.ts`, `redirect(\`/vehiculos/${r.valor.id}\`)`. En `tests/integracion/vehiculos.test.ts`, donde se use `r.valor` del alta como id, pasar a `r.valor.id`.

- [ ] **Step 3: Verificar que fallan** — `npx vitest run --project integracion tests/integracion/estado.test.ts` → FAIL (no existe `@/datos/estado`).

- [ ] **Step 4: Implementación** — `src/datos/estado.ts`:

```ts
import { fechaDeHoy } from "@/dominio/fechas";
import {
  calcularEstado,
  resumen,
  supuestosFaltantes,
  type Ejecucion,
  type ItemConEstado,
  type ItemDelPlan,
} from "@/dominio/motor";
import { conUsuario, type ClaimsUsuario, type TxUsuario } from "./cliente-usuario";

export type EstadoVehiculo = { catalogado: boolean; kmActual: number; items: ItemConEstado[] };
export type ResumenEstado = ReturnType<typeof resumen>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * CU-14 dentro de una transacción del usuario (RLS): arma la entrada del motor, guarda los
 * supuestos que falten (spec 4.2, enfoque A) y calcula. `hoy` es un día calendario.
 */
export async function calcularEnTx(tx: TxUsuario, vehiculoId: string, hoy: Date): Promise<EstadoVehiculo | null> {
  const v = await tx.vehiculo.findUnique({ where: { id: vehiculoId }, select: { modeloId: true, fechaAlta: true } });
  if (!v) return null;
  const [alta, ultima] = await Promise.all([
    tx.lecturaKilometraje.findFirst({ where: { vehiculoId }, orderBy: [{ fecha: "asc" }, { id: "asc" }] }),
    tx.lecturaKilometraje.findFirst({ where: { vehiculoId }, orderBy: { kilometraje: "desc" } }),
  ]);
  const kmActual = ultima?.kilometraje ?? 0;
  if (v.modeloId === null) return { catalogado: false, kmActual, items: [] };

  const plan = await tx.planMantenimiento.findFirst({
    where: { modeloId: v.modeloId, estado: "publicado" },
    include: { intervalos: { include: { item: true } } },
  });
  const items: ItemDelPlan[] = (plan?.intervalos ?? []).map((i) => ({
    itemId: i.itemId,
    nombre: i.item.nombre,
    tipo: i.item.tipo,
    km: i.intervaloKm,
    meses: i.intervaloMeses,
  }));
  const filas = await tx.intervencion.findMany({
    where: { vehiculoId, itemId: { in: items.map((i) => i.itemId) } },
    select: { itemId: true, origen: true, kilometraje: true, fecha: true },
  });
  const intervenciones: Ejecucion[] = filas.map((f) => ({ itemId: f.itemId!, origen: f.origen, km: f.kilometraje, fecha: f.fecha }));
  const kmAlta = alta?.kilometraje ?? 0;

  const faltantes = supuestosFaltantes({ items, intervenciones, kmAlta });
  if (faltantes.length > 0) {
    await tx.intervencion.createMany({
      data: faltantes.map((s) => ({ vehiculoId, itemId: s.itemId, origen: "supuesta_pendiente" as const, kilometraje: s.km })),
      skipDuplicates: true,
    });
    intervenciones.push(...faltantes.map((s) => ({ itemId: s.itemId, origen: "supuesta_pendiente" as const, km: s.km, fecha: null })));
  }

  return {
    catalogado: true,
    kmActual,
    items: calcularEstado({ items, intervenciones, kmAlta, fechaAlta: fechaDeHoy(v.fechaAlta), kmActual, hoy }),
  };
}

/** CU-09: estado del vehículo, recalculado con la fecha del día. */
export async function estadoDelVehiculo(
  claims: ClaimsUsuario,
  vehiculoId: string,
  ahora: Date = new Date(),
): Promise<EstadoVehiculo | null> {
  if (!UUID.test(vehiculoId)) return null;
  return conUsuario(claims, (tx) => calcularEnTx(tx, vehiculoId, fechaDeHoy(ahora)));
}

/** Chips de "Mis vehículos" (mockup 04): null para los modelos fuera del catálogo. */
export async function resumenesDeMisVehiculos(
  claims: ClaimsUsuario,
  ahora: Date = new Date(),
): Promise<Record<string, ResumenEstado | null>> {
  const hoy = fechaDeHoy(ahora);
  return conUsuario(claims, async (tx) => {
    const vehiculos = await tx.vehiculo.findMany({ select: { id: true } });
    const salida: Record<string, ResumenEstado | null> = {};
    for (const { id } of vehiculos) {
      const e = await calcularEnTx(tx, id, hoy);
      salida[id] = e?.catalogado ? resumen(e.items) : null;
    }
    return salida;
  });
}
```

- [ ] **Step 5: Verificar** — `npx vitest run --project integracion tests/integracion/estado.test.ts tests/integracion/vehiculos.test.ts` → pasan. `npm run typecheck`, `npm run lint` limpios.

- [ ] **Step 6: Commit** — `git add src/datos/estado.ts src/datos/vehiculos.ts "src/app/(propietario)/vehiculos/acciones.ts" tests/integracion/estado.test.ts tests/integracion/vehiculos.test.ts` · `git commit -m "feat: estado del vehículo con supuestos guardados (CU-09, CU-14)"`

---

### Task 4: Las tres respuestas de CU-06

**Files:**
- Modify: `src/datos/estado.ts`, `tests/integracion/estado.test.ts`

**Interfaces:**
- Consumes: `validarConfirmacion`, `validarCorreccion` (Task 2); `calcularEnTx` (Task 3).
- Produces:
  - `type SupuestoPendiente = { itemId: number; nombre: string; km: number; origen: "supuesta_pendiente" | "supuesta_a_verificar" }`
  - `supuestosDelVehiculo(claims, vehiculoId, ahora?): Promise<{ kmActual: number; supuestos: SupuestoPendiente[] } | null>` (los supuestos de los ítems del plan vigente, en el orden del motor)
  - `confirmarSupuesto(claims, vehiculoId, itemId, fecha: unknown, ahora?): Promise<Resultado<null>>`
  - `corregirSupuesto(claims, vehiculoId, itemId, km: unknown, fecha: unknown, ahora?): Promise<Resultado<null>>`
  - `marcarAVerificar(claims, vehiculoId, itemId): Promise<Resultado<null>>`
  - `Resultado` se importa de `./vehiculos`.

- [ ] **Step 1: Pruebas que fallan** — agregar a `tests/integracion/estado.test.ts` (sumar `confirmarSupuesto`, `corregirSupuesto`, `marcarAVerificar`, `supuestosDelVehiculo` al import de `@/datos/estado`):

```ts
describe("confirmación de supuestos (CU-06)", () => {
  async function kaConSupuestos(usuario: string) {
    const id = await nuevoKa(usuario, 62_400);
    const s = await supuestosDelVehiculo(claimsDe(usuario), id);
    const aceite = s!.supuestos.find((x) => x.nombre === "Aceite y filtro de aceite")!;
    return { id, aceite };
  }
  const itemDe = async (u: string, id: string, itemId: number) =>
    (await estadoDelVehiculo(claimsDe(u), id))!.items.find((i) => i.itemId === itemId)!;

  it("lista los 6 supuestos con su km y la lectura actual", async () => {
    const { id, aceite } = await kaConSupuestos(a);
    const s = await supuestosDelVehiculo(claimsDe(a), id);
    expect(s?.kmActual).toBe(62_400);
    expect(s?.supuestos).toHaveLength(6);
    expect(aceite).toMatchObject({ km: 60_000, origen: "supuesta_pendiente" });
  });

  it("confirmar guarda la fecha y saca la marca (paso 3)", async () => {
    const { id, aceite } = await kaConSupuestos(a);
    expect(await confirmarSupuesto(claimsDe(a), id, aceite.itemId, "2026-03-10")).toEqual({ ok: true, valor: null });
    const fila = await db.intervencion.findFirstOrThrow({ where: { vehiculoId: id, itemId: aceite.itemId } });
    expect(fila).toMatchObject({ origen: "supuesta_confirmada", kilometraje: 60_000, fecha: new Date("2026-03-10T00:00:00Z") });
    expect(await itemDe(a, id, aceite.itemId)).toMatchObject({ incertidumbre: null, fechaVence: new Date("2027-03-10T00:00:00Z") });
    expect((await supuestosDelVehiculo(claimsDe(a), id))?.supuestos).toHaveLength(5);
  });

  it("confirmar dos veces no pisa la fecha ya confirmada", async () => {
    const { id, aceite } = await kaConSupuestos(a);
    await confirmarSupuesto(claimsDe(a), id, aceite.itemId, "2026-03-10");
    const r = await confirmarSupuesto(claimsDe(a), id, aceite.itemId, "2026-04-01");
    expect(r.ok).toBe(false);
    const fila = await db.intervencion.findFirstOrThrow({ where: { vehiculoId: id, itemId: aceite.itemId } });
    expect(fila.fecha).toEqual(new Date("2026-03-10T00:00:00Z"));
  });

  it("rechaza una fecha futura (2d) sin cambiar nada", async () => {
    const { id, aceite } = await kaConSupuestos(a);
    const r = await confirmarSupuesto(claimsDe(a), id, aceite.itemId, "2099-01-01");
    expect(r).toEqual({ ok: false, errores: { fecha: "La fecha no puede ser posterior a hoy." } });
    expect((await db.intervencion.findFirstOrThrow({ where: { vehiculoId: id, itemId: aceite.itemId } })).origen).toBe(
      "supuesta_pendiente",
    );
  });

  it("corregir reemplaza km y fecha y queda confirmado (2a)", async () => {
    const { id, aceite } = await kaConSupuestos(a);
    expect(await corregirSupuesto(claimsDe(a), id, aceite.itemId, "58.000", "2026-02-01")).toEqual({ ok: true, valor: null });
    expect(await db.intervencion.findFirstOrThrow({ where: { vehiculoId: id, itemId: aceite.itemId } })).toMatchObject({
      origen: "supuesta_confirmada",
      kilometraje: 58_000,
      fecha: new Date("2026-02-01T00:00:00Z"),
    });
  });

  it("corregir con km mayor a la lectura actual se rechaza (2d)", async () => {
    const { id, aceite } = await kaConSupuestos(a);
    expect(await corregirSupuesto(claimsDe(a), id, aceite.itemId, "63000", "2026-02-01")).toEqual({
      ok: false,
      errores: { km: "No puede superar 62.400 km, la lectura actual." },
    });
  });

  it('"No lo sé" lo marca para verificar en el taller (2b) y se puede confirmar después', async () => {
    const { id, aceite } = await kaConSupuestos(a);
    expect(await marcarAVerificar(claimsDe(a), id, aceite.itemId)).toEqual({ ok: true, valor: null });
    expect((await itemDe(a, id, aceite.itemId)).incertidumbre).toBe("verificar_en_taller");
    expect(await confirmarSupuesto(claimsDe(a), id, aceite.itemId, "2026-03-10")).toEqual({ ok: true, valor: null });
  });

  it("otro usuario no puede confirmar, corregir ni marcar supuestos ajenos", async () => {
    const { id, aceite } = await kaConSupuestos(a);
    for (const r of [
      await confirmarSupuesto(claimsDe(b), id, aceite.itemId, "2026-03-10"),
      await corregirSupuesto(claimsDe(b), id, aceite.itemId, "1000", "2026-03-10"),
      await marcarAVerificar(claimsDe(b), id, aceite.itemId),
    ]) {
      expect(r.ok).toBe(false);
    }
    expect((await db.intervencion.findFirstOrThrow({ where: { vehiculoId: id, itemId: aceite.itemId } })).origen).toBe(
      "supuesta_pendiente",
    );
    expect(await supuestosDelVehiculo(claimsDe(b), id)).toBeNull();
  });
});
```

- [ ] **Step 2: Verificar que fallan** — `npx vitest run --project integracion tests/integracion/estado.test.ts` → FAIL (las funciones no existen).

- [ ] **Step 3: Implementación** — agregar a `src/datos/estado.ts` (imports al principio: `validarConfirmacion`, `validarCorreccion` de `@/dominio/supuestos`; `type Resultado` de `./vehiculos`):

```ts
export type SupuestoPendiente = {
  itemId: number;
  nombre: string;
  km: number;
  origen: "supuesta_pendiente" | "supuesta_a_verificar";
};

const SIN_SUPUESTO: Resultado<never> = {
  ok: false,
  errores: { formulario: "Ese dato ya no está para confirmar. Volvé a la ficha del vehículo." },
};
const PENDIENTES = ["supuesta_pendiente", "supuesta_a_verificar"] as const;

/** CU-06 paso 1: supuestos sin confirmar del plan vigente, en el orden del motor. */
export async function supuestosDelVehiculo(
  claims: ClaimsUsuario,
  vehiculoId: string,
  ahora: Date = new Date(),
): Promise<{ kmActual: number; supuestos: SupuestoPendiente[] } | null> {
  if (!UUID.test(vehiculoId)) return null;
  return conUsuario(claims, async (tx) => {
    const e = await calcularEnTx(tx, vehiculoId, fechaDeHoy(ahora));
    if (!e) return null;
    const filas = await tx.intervencion.findMany({
      where: { vehiculoId, origen: { in: [...PENDIENTES] } },
      select: { itemId: true, kilometraje: true, origen: true },
    });
    const porItem = new Map(filas.map((f) => [f.itemId, f]));
    const supuestos = e.items.flatMap((i) => {
      const f = porItem.get(i.itemId);
      return f ? [{ itemId: i.itemId, nombre: i.nombre, km: f.kilometraje, origen: f.origen as SupuestoPendiente["origen"] }] : [];
    });
    return { kmActual: e.kmActual, supuestos };
  });
}

async function actualizarSupuesto(
  tx: TxUsuario,
  vehiculoId: string,
  itemId: number,
  data: { origen: "supuesta_confirmada" | "supuesta_a_verificar"; kilometraje?: number; fecha?: Date },
): Promise<Resultado<null>> {
  const r = await tx.intervencion.updateMany({ where: { vehiculoId, itemId, origen: { in: [...PENDIENTES] } }, data });
  return r.count === 1 ? { ok: true, valor: null } : SIN_SUPUESTO;
}

async function kmActualDe(tx: TxUsuario, vehiculoId: string): Promise<number | null> {
  const ultima = await tx.lecturaKilometraje.findFirst({ where: { vehiculoId }, orderBy: { kilometraje: "desc" } });
  return ultima?.kilometraje ?? null;
}

/** CU-06 paso 2: confirma el supuesto con su fecha. */
export async function confirmarSupuesto(
  claims: ClaimsUsuario,
  vehiculoId: string,
  itemId: number,
  fecha: unknown,
  ahora: Date = new Date(),
): Promise<Resultado<null>> {
  const v = validarConfirmacion({ fecha, hoy: fechaDeHoy(ahora) });
  if (!v.ok) return v;
  if (!UUID.test(vehiculoId)) return SIN_SUPUESTO;
  return conUsuario(claims, (tx) => actualizarSupuesto(tx, vehiculoId, itemId, { origen: "supuesta_confirmada", fecha: v.fecha }));
}

/** CU-06 2a: reemplaza el supuesto por el km y la fecha reales. */
export async function corregirSupuesto(
  claims: ClaimsUsuario,
  vehiculoId: string,
  itemId: number,
  km: unknown,
  fecha: unknown,
  ahora: Date = new Date(),
): Promise<Resultado<null>> {
  if (!UUID.test(vehiculoId)) return SIN_SUPUESTO;
  return conUsuario(claims, async (tx) => {
    const kmActual = await kmActualDe(tx, vehiculoId);
    if (kmActual === null) return SIN_SUPUESTO;
    const v = validarCorreccion({ km, fecha, kmActual, hoy: fechaDeHoy(ahora) });
    if (!v.ok) return v;
    return actualizarSupuesto(tx, vehiculoId, itemId, { origen: "supuesta_confirmada", kilometraje: v.km, fecha: v.fecha });
  });
}

/** CU-06 2b: "No lo sé". */
export async function marcarAVerificar(claims: ClaimsUsuario, vehiculoId: string, itemId: number): Promise<Resultado<null>> {
  if (!UUID.test(vehiculoId)) return SIN_SUPUESTO;
  return conUsuario(claims, async (tx) => {
    const r = await tx.intervencion.updateMany({
      where: { vehiculoId, itemId, origen: "supuesta_pendiente" },
      data: { origen: "supuesta_a_verificar" },
    });
    return r.count === 1 ? { ok: true, valor: null } : SIN_SUPUESTO;
  });
}
```

- [ ] **Step 4: Verificar** — `npx vitest run --project integracion tests/integracion/estado.test.ts` → pasan. `npm run typecheck`, `npm run lint` limpios.

- [ ] **Step 5: Commit** — `git add src/datos/estado.ts tests/integracion/estado.test.ts` · `git commit -m "feat: confirmar, corregir y marcar supuestos (CU-06)"`

---

### Task 5: Alta y kilometraje conectados al motor; documentación; PR

**Files:**
- Modify: `src/datos/vehiculos.ts`, `src/app/(propietario)/vehiculos/acciones.ts`, `tests/integracion/estado.test.ts`, `README.md`, `docs/superpowers/specs/2026-10-12-iteracion-2-motor-design.md`

**Interfaces:**
- Consumes: `calcularEnTx` (Task 3), `cambiosDeEstado`, `type Cambio` de `@/dominio/motor`.
- Produces: `crearVehiculo` → `Resultado<{ id: string; conSupuestos: boolean }>` (`conSupuestos` real); `registrarLectura` → `Resultado<{ cambios: Cambio[] }>`. Los consumen los planes 2D (redirigir a la confirmación) y 2E (aviso de cambios).

- [ ] **Step 1: Pruebas que fallan** — agregar a `tests/integracion/estado.test.ts` (sumar `registrarLectura` al import de `@/datos/vehiculos`):

```ts
describe("alta y kilometraje con el motor (CU-05 paso 6, CU-08 paso 7)", () => {
  it("el alta avisa si creó supuestos", async () => {
    const usado = await crearVehiculo(claimsDe(a), { tipo: "catalogo", modeloId: kaId, anio: 2014 }, 62_400);
    const nuevo = await crearVehiculo(claimsDe(a), { tipo: "catalogo", modeloId: kaId, anio: 2014 }, 500);
    expect(usado.ok && usado.valor.conSupuestos).toBe(true);
    expect(nuevo.ok && nuevo.valor.conSupuestos).toBe(false);
    if (usado.ok) expect(await supuestosDe(usado.valor.id)).toBe(6);
  });

  it("actualizar el kilometraje devuelve los ítems que cambiaron de estado", async () => {
    const id = await nuevoKa(a, 62_400);
    const r = await registrarLectura(claimsDe(a), id, 75_300);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.valor.cambios.map((c) => c.nombre).sort()).toEqual(
      ["Aceite y filtro de aceite", "Amortiguadores", "Neumáticos", "Pastillas de freno delanteras"].sort(),
    );
    expect(r.valor.cambios.every((c) => c.estado === "vencido")).toBe(true);
  });

  it("una lectura menor sigue rechazándose con el mensaje de la aplicación", async () => {
    const id = await nuevoKa(a, 62_400);
    expect(await registrarLectura(claimsDe(a), id, 62_000)).toEqual({
      ok: false,
      errores: { kilometraje: "No puede ser menor a 62.400 km, la última lectura." },
    });
  });
});
```

- [ ] **Step 2: Verificar que fallan** — `npx vitest run --project integracion tests/integracion/estado.test.ts` → FAIL ("el alta avisa…" da `conSupuestos: false` para el usado; `registrarLectura` no devuelve `cambios`).

- [ ] **Step 3: Implementación** — en `src/datos/vehiculos.ts` (imports: `calcularEnTx` de `./estado`; `cambiosDeEstado`, `type Cambio` de `@/dominio/motor`):

`crearVehiculo`, después de crear el vehículo y antes del `return`:

```ts
    // CU-05 paso 6: el cálculo guarda los supuestos; si hay, el alta ofrece confirmarlos (CU-06).
    const estado = await calcularEnTx(tx, v.id, fechaDeHoy());
    const conSupuestos = estado?.items.some((i) => i.incertidumbre !== null) ?? false;
    return { ok: true, valor: { id: v.id, conSupuestos } };
```

`registrarLectura` pasa a `Promise<Resultado<{ cambios: Cambio[] }>>`; después de la validación:

```ts
    const hoy = fechaDeHoy();
    const antes = await calcularEnTx(tx, id, hoy);
    await tx.lecturaKilometraje.create({ data: { vehiculoId: id, kilometraje, fecha: hoy } });
    const despues = await calcularEnTx(tx, id, hoy);
    // CU-08 paso 7: los ítems que cambiaron de estado con la lectura nueva.
    return { ok: true, valor: { cambios: cambiosDeEstado(antes?.items ?? [], despues?.items ?? []) } };
```

Ruling previsto: `src/datos/estado.ts` importa `Resultado` de `./vehiculos` y `vehiculos.ts` importa `calcularEnTx` de `./estado`. La dependencia circular es solo de tipos en un sentido (`import type`), así que no hay ciclo en tiempo de ejecución.

En `src/app/(propietario)/vehiculos/acciones.ts`, `actualizarKilometraje` sigue funcionando con `r.ok` (los cambios los muestra el plan 2E); si TypeScript se queja por el tipo del retorno, ajustar solo el tipo.

- [ ] **Step 4: Documentación** — en `README.md`, al final de "Despliegue (RNF-13)":

```markdown
- Limitación de las vistas previas: comparten el proyecto de Supabase de desarrollo, cuya lista
  de Redirect URLs solo tiene `http://localhost:3000/**`. Ingresar funciona; crear una cuenta o
  recuperar la contraseña desde una vista previa no (el enlace del correo cae en localhost). No se
  usan comodines de `*.vercel.app`: cualquiera puede crear un proyecto con ese nombre y recibir
  los enlaces. Nota para la tesis final: una base efímera por PR (Supabase branching).
```

En la spec de la Iteración 2, apartado 9, punto 5, reemplazar "(pendiente de comprobar desde la reconexión con GitHub del 12/10)" por "(comprobado el 12/10/2026: el job `desplegar` del CI despliega producción después de los tres checks; la conexión Git de Vercel quedó apagada)".

- [ ] **Step 5: Verificar todo** — `npm run test:cobertura`, `npm run test:integracion`, `npm run typecheck`, `npm run lint`, `npm run build`, `npx playwright test` (con la red del celular).

- [ ] **Step 6: Commit** — `git add src tests README.md docs` · `git commit -m "feat: el alta y el kilometraje usan el motor (supuestos y cambios de estado)"`

- [ ] **Step 7: PR** — escaneo de secretos; push; `gh pr create --title "Iteración 2B: datos del estado y supuestos"`; merge con los checks en verde (autorizado por Felipe el 12/10/2026).
