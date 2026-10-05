# Iteración 1A — Fundaciones: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dejar el proyecto Next.js creado, la base de datos de la Figura 7 migrada en Supabase con sus restricciones y su seguridad por fila, el acceso a datos "en nombre del usuario" probado contra la base real, el catálogo del Ford Ka cargado y la integración continua funcionando.

**Architecture:** Un único proyecto Next.js 16 en `app/`, con tres capas: `src/app` (presentación), `src/dominio` (reglas sin dependencias) y `src/datos` (único acceso a la base). Prisma 7 con `@prisma/adapter-pg` se conecta como `postgres`. Cada operación de un usuario corre dentro de una transacción que primero ejecuta `SET LOCAL ROLE authenticated` y carga sus *claims*, de modo que las políticas RLS de PostgreSQL se aplican de verdad. Las restricciones, el trigger de alta y las políticas viven en SQL propio dentro de la migración inicial.

**Tech Stack:** Next.js 16, React 19, TypeScript estricto, Tailwind 4, Prisma 7.10 (`prisma`, `@prisma/client`, `@prisma/adapter-pg`), Supabase (`@supabase/supabase-js` 2.x), Vitest 5, tsx, dotenv, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-10-05-iteracion-1-base-design.md`

**Planes de la Iteración 1** (cada uno se escribe cuando termina el anterior):
- **1A — Fundaciones** (este plan).
- 1B — Autenticación y estructura visual: clientes de Supabase, `proxy.ts`, CU-01 a CU-04, tokens del DESIGN.md, shadcn/ui.
- 1C — Vehículos: CU-05, CU-07 y CU-08, sin el cálculo del estado.
- 1D — Catálogo: CU-15 a CU-17, con versionado y publicación.
- 1E — Cierre: prueba de punta a punta con Playwright, Vercel, Resend y RNF-13.

## Global Constraints

- Node 24; npm (no pnpm ni yarn).
- `prisma` y `@prisma/client` fijados en la **misma** versión 7.10.x; `@prisma/adapter-pg` en la misma línea 7.x. No usar Prisma 8 (versión preliminar).
- TypeScript con `"strict": true`.
- Nombres de tablas, columnas y tipos enumerados: **exactamente** los de la Figura 7 del informe, en minúsculas y con guion bajo (`vehiculo`, `lectura_kilometraje`, `usuario_id`…). En Prisma los modelos van en PascalCase con `@@map`/`@map`.
- `src/dominio/` no importa Prisma, Next ni Supabase. `src/app/` no importa Prisma. Solo `src/datos/privilegiado.ts`, el seed y las pruebas usan la conexión privilegiada. Se controla con ESLint (Task 2).
- Las claves van solo en `.env.local` (ignorado por git). En el repositorio queda `.env.example` sin valores. Antes de cada commit: `git diff --cached | grep -iE "sb_secret|sb_publishable|postgres(ql)?://[^:]+:[^@]+@"` no debe devolver nada.
- Mensajes de error y textos visibles en español rioplatense. Números con formato `es-AR` (`62.400`).
- Commits con prefijos convencionales y la línea `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Todos los comandos se ejecutan desde `app/` salvo que el paso diga otra cosa.

## Ajustes respecto de la especificación (se aplican en la Task 10)

1. **Apartado 4.4:** en vez de una extensión de Prisma que envuelve cada consulta suelta, una función `conUsuario(claims, fn)` que abre **una** transacción interactiva por operación. Las operaciones de varios pasos (bloquear el vehículo, validar y guardar la lectura) quedan atómicas, que es lo que pide el apartado 4.2. RLS se aplica igual.
2. **Apartado 4.4:** `item_mantenimiento` es legible por cualquier usuario autenticado. El historial de un propietario referencia ítems que pueden haber salido de un plan publicado (versión `reemplazado`), y tiene que poder leer su nombre. Los nombres de ítems no son datos personales.
3. **Apartado 7:** los tres roles se insertan en la migración (son datos de referencia que el trigger necesita), no en el seed.
4. **Apartado 7:** el modelo Ka se carga con años 2014–2014, que es lo que respalda el manual. Ampliar el rango solo si se verifica que el mismo plan aplica a otros años.

## Mapa de archivos

| Archivo | Responsabilidad |
|---|---|
| `package.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs` | Proyecto Next.js generado; ESLint con las reglas de capas |
| `vitest.config.ts` | Dos proyectos de prueba: `unit` y `integracion` |
| `.env.example` | Nombres de las variables, sin valores |
| `prisma.config.ts` | Configuración de Prisma 7: esquema, migraciones, seed, URL para la CLI |
| `prisma/schema.prisma` | Las 12 entidades de la Figura 7 |
| `prisma/migrations/0001_inicial/migration.sql` | Tablas generadas + SQL propio (restricciones, roles, trigger, `tiene_rol`, RLS) |
| `prisma/seed.ts` | Ford Ka 2014 con su plan publicado; roles de administrador al `ADMIN_EMAIL` |
| `src/datos/prisma.ts` | Instancia única de Prisma con el adaptador `pg` |
| `src/datos/cliente-usuario.ts` | `conUsuario(claims, fn)` y el tipo `ClaimsUsuario` |
| `src/datos/privilegiado.ts` | Conexión sin RLS y cliente de administración de Supabase |
| `src/dominio/kilometraje.ts` | Regla del kilometraje que no disminuye (RF-07) |
| `tests/unit/kilometraje.test.ts` | Pruebas de la regla |
| `tests/integracion/ayudantes.ts` | Crear y borrar usuarios de prueba, armar *claims* |
| `tests/integracion/*.test.ts` | Trigger, restricciones, RLS de vehículos y de catálogo, seed |
| `.github/workflows/ci.yml` | Tipos, lint y pruebas unitarias en cada push y PR |

---

### Task 1: Crear el proyecto Next.js dentro de `app/`

`app/` ya tiene `.git`, `docs/`, `DESIGN.md` y `CLAUDE.md`. `create-next-app` no se ejecuta sobre una carpeta con archivos, así que se genera en una carpeta temporal y se copia **sin pisar** lo existente.

**Files:**
- Create: todo lo que genera `create-next-app` (`package.json`, `src/app/*`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `postcss.config.mjs`, `public/*`, `.gitignore`, `README.md`)
- Modify: `CLAUDE.md` (solo si el generador trae un `AGENTS.md` o `CLAUDE.md` con indicaciones útiles)

**Interfaces:**
- Produces: proyecto que compila con `npm run build`; alias `@/*` → `src/*`.

- [ ] **Step 1: Generar el proyecto en una carpeta temporal**

Desde `C:\Users\felip\Downloads\tesis felipe`:

```bash
npx create-next-app@16 tmp-next --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --skip-install --yes
```

Expected: carpeta `tmp-next/` con `package.json` cuya dependencia `next` es `16.x`.

- [ ] **Step 2: Copiar sin pisar y borrar la temporal**

```bash
rm -rf tmp-next/.git
cp -rn tmp-next/. app/
ls tmp-next
rm -rf tmp-next
```

`cp -n` no sobrescribe: `app/CLAUDE.md` y `app/DESIGN.md` quedan intactos. Si `ls tmp-next` mostró un `AGENTS.md` o un `CLAUDE.md`, leer el de la temporal **antes** del `rm` y pasar a `app/CLAUDE.md` cualquier indicación sobre Next.js 16 que no esté.

- [ ] **Step 3: Verificar `.gitignore` e instalar**

Confirmar que `app/.gitignore` contiene las líneas `.env*` y `/node_modules`. Agregar al final:

```gitignore
# Cliente de Prisma generado
/src/generated/
# Excepción: plantilla de variables sin valores
!.env.example
```

```bash
cd app && npm install
```

- [ ] **Step 4: Verificar que compila**

Run: `npm run build`
Expected: `✓ Compiled successfully` y sin errores de tipos.

- [ ] **Step 5: Commit**

```bash
git add -A
git status --short   # revisar: no debe aparecer ningún .env ni node_modules
git commit -m "chore: proyecto Next.js 16 con TypeScript, Tailwind y ESLint" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Vitest, primera regla de dominio y reglas de capas en ESLint

**Files:**
- Create: `vitest.config.ts`, `src/dominio/kilometraje.ts`, `tests/unit/kilometraje.test.ts`
- Modify: `package.json` (scripts), `eslint.config.mjs`

**Interfaces:**
- Produces: `validarNuevaLectura(ultima: number | null, nueva: number): ResultadoValidacion` y `type ResultadoValidacion = { ok: true } | { ok: false; mensaje: string }` en `@/dominio/kilometraje`; `formatearKm(km: number): string`.

- [ ] **Step 1: Instalar Vitest y escribir su configuración**

```bash
npm install -D vitest@5 dotenv tsx
```

`vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const alias = { "@": fileURLToPath(new URL("./src", import.meta.url)) };

export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: "unit",
          include: ["tests/unit/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        resolve: { alias },
        test: {
          name: "integracion",
          include: ["tests/integracion/**/*.test.ts"],
          environment: "node",
          setupFiles: ["tests/integracion/entorno.ts"],
          fileParallelism: false,
          testTimeout: 30_000,
          hookTimeout: 30_000,
        },
      },
    ],
  },
});
```

En `package.json`, dentro de `"scripts"`, agregar:

```json
"typecheck": "tsc --noEmit",
"test": "vitest run --project unit",
"test:integracion": "vitest run --project integracion"
```

- [ ] **Step 2: Escribir la prueba que falla**

`tests/unit/kilometraje.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { formatearKm, validarNuevaLectura } from "@/dominio/kilometraje";

describe("formatearKm", () => {
  it("usa punto de miles, como en Argentina", () => {
    expect(formatearKm(62400)).toBe("62.400");
    expect(formatearKm(0)).toBe("0");
  });
});

describe("validarNuevaLectura (RF-07)", () => {
  it("acepta la primera lectura del vehículo", () => {
    expect(validarNuevaLectura(null, 62400)).toEqual({ ok: true });
  });

  it("acepta un auto 0 km", () => {
    expect(validarNuevaLectura(null, 0)).toEqual({ ok: true });
  });

  it("acepta una lectura igual a la última", () => {
    expect(validarNuevaLectura(62400, 62400)).toEqual({ ok: true });
  });

  it("acepta una lectura mayor", () => {
    expect(validarNuevaLectura(62400, 63000)).toEqual({ ok: true });
  });

  it("rechaza una lectura menor indicando el mínimo admitido (CU-08, 4a)", () => {
    expect(validarNuevaLectura(62400, 61900)).toEqual({
      ok: false,
      mensaje: "No puede ser menor a 62.400 km, la última lectura.",
    });
  });

  it("rechaza valores negativos o no enteros", () => {
    expect(validarNuevaLectura(null, -1)).toEqual({
      ok: false,
      mensaje: "Ingresá un kilometraje válido.",
    });
    expect(validarNuevaLectura(null, 100.5)).toEqual({
      ok: false,
      mensaje: "Ingresá un kilometraje válido.",
    });
  });
});
```

- [ ] **Step 3: Verificar que falla**

Run: `npm test`
Expected: FAIL, `Failed to resolve import "@/dominio/kilometraje"`.

- [ ] **Step 4: Implementar**

`src/dominio/kilometraje.ts`:

```ts
export type ResultadoValidacion = { ok: true } | { ok: false; mensaje: string };

const formato = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });

export function formatearKm(km: number): string {
  return formato.format(km);
}

/** RF-07: el odómetro no retrocede. `ultima` es null cuando el vehículo no tiene lecturas. */
export function validarNuevaLectura(ultima: number | null, nueva: number): ResultadoValidacion {
  if (!Number.isInteger(nueva) || nueva < 0) {
    return { ok: false, mensaje: "Ingresá un kilometraje válido." };
  }
  if (ultima !== null && nueva < ultima) {
    return {
      ok: false,
      mensaje: `No puede ser menor a ${formatearKm(ultima)} km, la última lectura.`,
    };
  }
  return { ok: true };
}
```

- [ ] **Step 5: Verificar que pasa**

Run: `npm test`
Expected: PASS, 7 pruebas.

- [ ] **Step 6: Reglas de capas en ESLint**

En la configuración plana de ESLint, cuando dos bloques definen la misma regla para un archivo, **el último reemplaza al anterior por completo**. Por eso cada bloque repite todos los patrones que le corresponden, y el orden importa. En `eslint.config.mjs`, agregar estos tres objetos al final del arreglo que exporta el archivo:

```js
  // A. Todo src: nadie usa los permisos de administrador (spec, apartado 3, regla 3)
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/datos/privilegiado.ts", "src/app/cuenta/acciones.ts"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [PRIVILEGIADO] }],
    },
  },
  // B. Presentación: además, no toca Prisma (regla 2)
  {
    files: ["src/app/**/*.{ts,tsx}"],
    ignores: ["src/app/cuenta/acciones.ts"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [PRIVILEGIADO, BASE] }],
    },
  },
  // C. Dominio: además, no depende de ningún framework (regla 1)
  {
    files: ["src/dominio/**/*.ts"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [PRIVILEGIADO, BASE, FRAMEWORKS] }],
    },
  },
```

Y arriba del `export default`, definir las constantes:

```js
const PRIVILEGIADO = {
  group: ["@/datos/privilegiado", "**/datos/privilegiado"],
  message: "Los permisos de administrador solo se usan en el seed, al eliminar la cuenta y en las pruebas (spec, apartado 3, regla 3).",
};
const BASE = {
  group: ["@/generated/*", "@prisma/*", "**/generated/prisma/*"],
  message: "Solo src/datos accede a la base (spec, apartado 3, regla 2).",
};
const FRAMEWORKS = {
  group: ["next", "next/*", "@supabase/*", "@/datos/*", "react", "react-dom"],
  message: "dominio/ no depende de frameworks ni de la base (spec, apartado 3, regla 1).",
};
```

- [ ] **Step 7: Verificar que la regla funciona**

```bash
printf 'import { PrismaClient } from "@prisma/client";\nexport const x = PrismaClient;\n' > src/dominio/_prueba.ts
npx eslint src/dominio/_prueba.ts
rm src/dominio/_prueba.ts
npm run lint
```

Expected: el primer `eslint` termina con error `Solo src/datos accede a la base`; `npm run lint` termina sin errores.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "test: Vitest y regla RF-07 del kilometraje; ESLint controla las capas" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Proyecto de Supabase y variables de entorno (lo hace Felipe)

Esta tarea no tiene código. **El agente se detiene acá y le pide a Felipe los pasos 1 a 3.** El agente nunca escribe ni repite valores de claves.

**Files:**
- Create: `.env.example` (lo escribe el agente)
- Create: `.env.local` (lo completa Felipe)

**Interfaces:**
- Produces: variables `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `DATABASE_URL`, `DIRECT_URL`, `ADMIN_EMAIL`.

- [ ] **Step 1 (Felipe): Crear el proyecto**

En supabase.com → New project: nombre `mantenimiento-vehicular-dev`, región **South America (São Paulo)**, contraseña de base generada y guardada en su gestor de contraseñas.

- [ ] **Step 2 (agente): Escribir `.env.example`**

```dotenv
# Supabase → Project Settings → API Keys
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
# Clave secreta (sb_secret_...). Solo servidor: seed, eliminar cuenta, pruebas.
SUPABASE_SECRET_KEY=

# Supabase → Connect → ORMs / Connection string
# Ejecución: pooler en modo transacción (puerto 6543)
DATABASE_URL=
# Migraciones y seed: pooler en modo sesión (puerto 5432)
DIRECT_URL=

# Correo de la cuenta que recibe los roles de administrador en el seed
ADMIN_EMAIL=
```

- [ ] **Step 3 (Felipe): Completar `.env.local`**

Copiar `.env.example` como `.env.local` y completar los valores desde el panel de Supabase. Para `DATABASE_URL` y `DIRECT_URL` usar las cadenas del **pooler** (Transaction y Session), no la conexión directa: la directa solo funciona por IPv6.

- [ ] **Step 4 (agente): Verificar que las variables están, sin mostrarlas**

```bash
node -e "require('dotenv').config({path:'.env.local'});for(const k of ['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','SUPABASE_SECRET_KEY','DATABASE_URL','DIRECT_URL','ADMIN_EMAIL'])console.log(k, process.env[k]?'OK':'FALTA')"
git check-ignore .env.local
```

Expected: las seis en `OK`; `git check-ignore` imprime `.env.local`.

- [ ] **Step 5: Commit**

```bash
git add .env.example
git commit -m "chore: plantilla de variables de entorno" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Esquema de Prisma con las 12 entidades

**Files:**
- Create: `prisma.config.ts`, `prisma/schema.prisma`
- Modify: `package.json`

**Interfaces:**
- Produces: cliente generado en `src/generated/prisma/` con los modelos `Usuario`, `Rol`, `UsuarioRol`, `Vehiculo`, `LecturaKilometraje`, `Marca`, `Modelo`, `PlanMantenimiento`, `ItemMantenimiento`, `IntervaloPlan`, `Intervencion`, `Comprobante` y los enums `EstadoPlan`, `TipoItem`, `OrigenIntervencion`.

- [ ] **Step 1: Instalar Prisma**

```bash
npm install @prisma/client@7.10 @prisma/adapter-pg@7.10 pg
npm install -D prisma@7.10 @types/pg
npx prisma --version
```

Expected: `prisma` y `@prisma/client` en la misma versión 7.10.x. Si `@prisma/adapter-pg@7.10` no existe, usar la última `7.x` disponible (`npm view @prisma/adapter-pg versions`).

- [ ] **Step 2: `prisma.config.ts`**

```ts
import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

config({ path: ".env.local" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // La CLI (migraciones y seed) usa el pooler en modo sesión.
    url: env("DIRECT_URL"),
  },
});
```

- [ ] **Step 3: `prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
}

enum EstadoPlan {
  borrador
  publicado
  reemplazado

  @@map("estado_plan")
}

enum TipoItem {
  reemplazo
  inspeccion

  @@map("tipo_item")
}

enum OrigenIntervencion {
  registrada
  supuesta_pendiente
  supuesta_confirmada
  supuesta_a_verificar

  @@map("origen_intervencion")
}

model Usuario {
  id        String       @id @db.Uuid
  email     String       @unique @db.VarChar(254)
  fechaAlta DateTime     @default(now()) @map("fecha_alta") @db.Timestamptz(6)
  roles     UsuarioRol[]
  vehiculos Vehiculo[]

  @@map("usuario")
}

model Rol {
  id       Int          @id @db.SmallInt
  nombre   String       @unique @db.VarChar(30)
  usuarios UsuarioRol[]

  @@map("rol")
}

model UsuarioRol {
  usuarioId       String   @map("usuario_id") @db.Uuid
  rolId           Int      @map("rol_id") @db.SmallInt
  fechaAsignacion DateTime @default(now()) @map("fecha_asignacion") @db.Timestamptz(6)
  usuario         Usuario  @relation(fields: [usuarioId], references: [id], onDelete: Cascade)
  rol             Rol      @relation(fields: [rolId], references: [id])

  @@id([usuarioId, rolId])
  @@map("usuario_rol")
}

model Vehiculo {
  id             String               @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  usuarioId      String               @map("usuario_id") @db.Uuid
  modeloId       Int?                 @map("modelo_id")
  marcaLibre     String?              @map("marca_libre") @db.VarChar(60)
  modeloLibre    String?              @map("modelo_libre") @db.VarChar(80)
  anio           Int                  @db.SmallInt
  fechaAlta      DateTime             @default(now()) @map("fecha_alta") @db.Timestamptz(6)
  usuario        Usuario              @relation(fields: [usuarioId], references: [id], onDelete: Cascade)
  modelo         Modelo?              @relation(fields: [modeloId], references: [id])
  lecturas       LecturaKilometraje[]
  intervenciones Intervencion[]

  @@index([usuarioId])
  @@map("vehiculo")
}

model LecturaKilometraje {
  id          BigInt   @id @default(autoincrement())
  vehiculoId  String   @map("vehiculo_id") @db.Uuid
  kilometraje Int
  fecha       DateTime @db.Date
  vehiculo    Vehiculo @relation(fields: [vehiculoId], references: [id], onDelete: Cascade)

  @@index([vehiculoId, kilometraje])
  @@map("lectura_kilometraje")
}

model Marca {
  id      Int      @id @default(autoincrement())
  nombre  String   @unique @db.VarChar(60)
  modelos Modelo[]

  @@map("marca")
}

model Modelo {
  id        Int                 @id @default(autoincrement())
  marcaId   Int                 @map("marca_id")
  nombre    String              @db.VarChar(80)
  anioDesde Int                 @map("anio_desde") @db.SmallInt
  anioHasta Int?                @map("anio_hasta") @db.SmallInt
  marca     Marca               @relation(fields: [marcaId], references: [id])
  planes    PlanMantenimiento[]
  items     ItemMantenimiento[]
  vehiculos Vehiculo[]

  @@index([marcaId])
  @@map("modelo")
}

model PlanMantenimiento {
  id               Int             @id @default(autoincrement())
  modeloId         Int             @map("modelo_id")
  version          Int             @db.SmallInt
  estado           EstadoPlan
  fechaPublicacion DateTime?       @map("fecha_publicacion") @db.Timestamptz(6)
  modelo           Modelo          @relation(fields: [modeloId], references: [id])
  intervalos       IntervaloPlan[]

  @@unique([modeloId, version])
  @@map("plan_mantenimiento")
}

model ItemMantenimiento {
  id             Int             @id @default(autoincrement())
  modeloId       Int             @map("modelo_id")
  nombre         String          @db.VarChar(80)
  tipo           TipoItem
  modelo         Modelo          @relation(fields: [modeloId], references: [id])
  intervalos     IntervaloPlan[]
  intervenciones Intervencion[]

  @@unique([modeloId, nombre])
  @@map("item_mantenimiento")
}

model IntervaloPlan {
  planId         Int               @map("plan_id")
  itemId         Int               @map("item_id")
  intervaloKm    Int               @map("intervalo_km")
  intervaloMeses Int?              @map("intervalo_meses") @db.SmallInt
  plan           PlanMantenimiento @relation(fields: [planId], references: [id], onDelete: Cascade)
  item           ItemMantenimiento @relation(fields: [itemId], references: [id])

  @@id([planId, itemId])
  @@map("intervalo_plan")
}

model Intervencion {
  id               String             @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  vehiculoId       String             @map("vehiculo_id") @db.Uuid
  itemId           Int?               @map("item_id")
  descripcionLibre String?            @map("descripcion_libre") @db.VarChar(200)
  origen           OrigenIntervencion
  fecha            DateTime?          @db.Date
  kilometraje      Int
  taller           String?            @db.VarChar(120)
  costo            Decimal?           @db.Decimal(12, 2)
  fechaRegistro    DateTime           @default(now()) @map("fecha_registro") @db.Timestamptz(6)
  vehiculo         Vehiculo           @relation(fields: [vehiculoId], references: [id], onDelete: Cascade)
  item             ItemMantenimiento? @relation(fields: [itemId], references: [id])
  comprobante      Comprobante?

  @@index([vehiculoId, itemId])
  @@map("intervencion")
}

model Comprobante {
  id             String       @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  intervencionId String       @unique @map("intervencion_id") @db.Uuid
  rutaArchivo    String       @map("ruta_archivo") @db.VarChar(255)
  tipoMime       String       @map("tipo_mime") @db.VarChar(20)
  tamanoBytes    Int          @map("tamano_bytes")
  fechaCarga     DateTime     @default(now()) @map("fecha_carga") @db.Timestamptz(6)
  intervencion   Intervencion @relation(fields: [intervencionId], references: [id], onDelete: Cascade)

  @@map("comprobante")
}
```

- [ ] **Step 4: Validar y generar**

```bash
npx prisma validate
npx prisma generate
```

Expected: `The schema at prisma/schema.prisma is valid` y `Generated Prisma Client ... to ./src/generated/prisma`.

En `package.json`, agregar `"postinstall": "prisma generate"` a `"scripts"` (Vercel y GitHub Actions necesitan generar el cliente después de instalar).

- [ ] **Step 5: Comparar con la Figura 7**

Abrir `C:\Users\felip\Downloads\tesis felipe\build_der.py` (diccionario `ENT`) y verificar, entidad por entidad, que cada atributo existe con el mismo nombre y tipo. Diferencias admitidas: ninguna.

- [ ] **Step 6: Commit**

```bash
git add prisma.config.ts prisma/schema.prisma package.json package-lock.json .gitignore
git commit -m "feat: esquema de Prisma con las 12 entidades de la Figura 7" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Migración inicial con restricciones, roles, trigger y RLS

Se genera el SQL de las tablas con `migrate diff` y se le agrega el SQL propio. **No se usa `prisma migrate dev`**: necesita una base "sombra" que no tiene el esquema `auth` de Supabase y fallaría con la clave foránea a `auth.users`.

**Files:**
- Create: `prisma/migrations/0001_inicial/migration.sql`, `prisma/migrations/migration_lock.toml`

**Interfaces:**
- Produces: función SQL `public.tiene_rol(nombre_rol text) returns boolean`; trigger `al_crear_usuario` en `auth.users`; roles `1 propietario`, `2 administrador_catalogo`, `3 administrador_tecnico`.

- [ ] **Step 1: Generar el SQL de las tablas**

```bash
mkdir -p prisma/migrations/0001_inicial
npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script > prisma/migrations/0001_inicial/migration.sql
printf 'provider = "postgresql"\n' > prisma/migrations/migration_lock.toml
head -5 prisma/migrations/0001_inicial/migration.sql
```

Expected: el archivo empieza con `-- CreateEnum` y `CREATE TYPE "public"."estado_plan"` (o `"estado_plan"`). Si la CLI rechaza `--to-schema`, revisar `npx prisma migrate diff --help` y usar el nombre de opción que indique para "esquema destino".

- [ ] **Step 2: Agregar el SQL propio al final del archivo**

Agregar esto al final de `prisma/migrations/0001_inicial/migration.sql`:

```sql
-- =====================================================================
-- SQL propio (spec, apartados 4.1 a 4.4)
-- =====================================================================

-- USUARIO comparte el identificador con la tabla de autenticación (7.1.2)
ALTER TABLE public.usuario
  ADD CONSTRAINT usuario_id_auth_fkey FOREIGN KEY (id) REFERENCES auth.users (id) ON DELETE CASCADE;

-- Restricciones de verificación (7.1.2)
ALTER TABLE public.intervalo_plan
  ADD CONSTRAINT intervalo_km_positivo CHECK (intervalo_km > 0),
  ADD CONSTRAINT intervalo_meses_positivo CHECK (intervalo_meses IS NULL OR intervalo_meses > 0);
ALTER TABLE public.lectura_kilometraje
  ADD CONSTRAINT lectura_km_no_negativo CHECK (kilometraje >= 0);
ALTER TABLE public.intervencion
  ADD CONSTRAINT intervencion_km_no_negativo CHECK (kilometraje >= 0),
  ADD CONSTRAINT intervencion_item_o_descripcion CHECK ((item_id IS NULL) <> (descripcion_libre IS NULL));
ALTER TABLE public.comprobante
  ADD CONSTRAINT comprobante_tamano CHECK (tamano_bytes > 0 AND tamano_bytes <= 5242880);
ALTER TABLE public.modelo
  ADD CONSTRAINT modelo_rango_anios CHECK (anio_hasta IS NULL OR anio_desde <= anio_hasta);
ALTER TABLE public.vehiculo
  ADD CONSTRAINT vehiculo_modelo_o_libre CHECK (
    (modelo_id IS NOT NULL AND marca_libre IS NULL AND modelo_libre IS NULL)
    OR (modelo_id IS NULL AND marca_libre IS NOT NULL AND modelo_libre IS NOT NULL)
  );
CREATE UNIQUE INDEX plan_un_publicado_por_modelo
  ON public.plan_mantenimiento (modelo_id) WHERE estado = 'publicado';

-- Roles: datos de referencia que el trigger necesita
INSERT INTO public.rol (id, nombre) VALUES
  (1, 'propietario'),
  (2, 'administrador_catalogo'),
  (3, 'administrador_tecnico');

-- Alta automática del usuario con rol propietario (spec 4.3)
CREATE FUNCTION public.crear_usuario() RETURNS trigger
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.usuario (id, email, fecha_alta) VALUES (NEW.id, NEW.email, now());
  INSERT INTO public.usuario_rol (usuario_id, rol_id, fecha_asignacion) VALUES (NEW.id, 1, now());
  RETURN NEW;
END;
$$;
CREATE TRIGGER al_crear_usuario
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.crear_usuario();

-- Consulta de rol para las políticas, sin recursión (spec 4.4)
CREATE FUNCTION public.tiene_rol(nombre_rol text) RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuario_rol ur
    JOIN public.rol r ON r.id = ur.rol_id
    WHERE ur.usuario_id = auth.uid() AND r.nombre = nombre_rol
  );
$$;
REVOKE EXECUTE ON FUNCTION public.tiene_rol(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.tiene_rol(text) TO authenticated;

-- Permisos: el rol authenticated opera; anon no accede a nada
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Seguridad a nivel de fila (RNF-04)
ALTER TABLE public.usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rol ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuario_rol ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehiculo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lectura_kilometraje ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marca ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modelo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_mantenimiento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_mantenimiento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intervalo_plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intervencion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comprobante ENABLE ROW LEVEL SECURITY;

-- Cuenta y roles: cada uno ve lo suyo; nadie escribe en esta iteración
CREATE POLICY usuario_propio ON public.usuario
  FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY usuario_rol_propio ON public.usuario_rol
  FOR SELECT TO authenticated USING (usuario_id = auth.uid());
CREATE POLICY rol_lectura ON public.rol
  FOR SELECT TO authenticated USING (true);

-- Datos del propietario
CREATE POLICY vehiculo_dueno ON public.vehiculo
  FOR ALL TO authenticated
  USING (usuario_id = auth.uid()) WITH CHECK (usuario_id = auth.uid());
CREATE POLICY lectura_dueno ON public.lectura_kilometraje
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.vehiculo v WHERE v.id = vehiculo_id AND v.usuario_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.vehiculo v WHERE v.id = vehiculo_id AND v.usuario_id = auth.uid()));
CREATE POLICY intervencion_dueno ON public.intervencion
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.vehiculo v WHERE v.id = vehiculo_id AND v.usuario_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.vehiculo v WHERE v.id = vehiculo_id AND v.usuario_id = auth.uid()));
CREATE POLICY comprobante_dueno ON public.comprobante
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.intervencion i JOIN public.vehiculo v ON v.id = i.vehiculo_id
    WHERE i.id = intervencion_id AND v.usuario_id = auth.uid()))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.intervencion i JOIN public.vehiculo v ON v.id = i.vehiculo_id
    WHERE i.id = intervencion_id AND v.usuario_id = auth.uid()));

-- Catálogo: lectura para todos los autenticados (los planes, solo publicados);
-- escritura solo para el administrador de catálogo
CREATE POLICY marca_lectura ON public.marca FOR SELECT TO authenticated USING (true);
CREATE POLICY modelo_lectura ON public.modelo FOR SELECT TO authenticated USING (true);
CREATE POLICY item_lectura ON public.item_mantenimiento FOR SELECT TO authenticated USING (true);
CREATE POLICY plan_lectura ON public.plan_mantenimiento FOR SELECT TO authenticated
  USING (estado = 'publicado' OR public.tiene_rol('administrador_catalogo'));
CREATE POLICY intervalo_lectura ON public.intervalo_plan FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.plan_mantenimiento p WHERE p.id = plan_id));

CREATE POLICY marca_admin ON public.marca FOR ALL TO authenticated
  USING (public.tiene_rol('administrador_catalogo')) WITH CHECK (public.tiene_rol('administrador_catalogo'));
CREATE POLICY modelo_admin ON public.modelo FOR ALL TO authenticated
  USING (public.tiene_rol('administrador_catalogo')) WITH CHECK (public.tiene_rol('administrador_catalogo'));
CREATE POLICY item_admin ON public.item_mantenimiento FOR ALL TO authenticated
  USING (public.tiene_rol('administrador_catalogo')) WITH CHECK (public.tiene_rol('administrador_catalogo'));
CREATE POLICY plan_admin ON public.plan_mantenimiento FOR ALL TO authenticated
  USING (public.tiene_rol('administrador_catalogo')) WITH CHECK (public.tiene_rol('administrador_catalogo'));
CREATE POLICY intervalo_admin ON public.intervalo_plan FOR ALL TO authenticated
  USING (public.tiene_rol('administrador_catalogo')) WITH CHECK (public.tiene_rol('administrador_catalogo'));
```

`intervalo_lectura` reutiliza la política de `plan_mantenimiento`: la subconsulta solo ve los planes que el usuario puede leer.

- [ ] **Step 3: Aplicar la migración**

```bash
npx prisma migrate deploy
```

Expected: `1 migration found` y `All migrations have been successfully applied`.

- [ ] **Step 4: Proteger la tabla de control de Prisma**

`migrate deploy` crea `public._prisma_migrations`, que la API de Supabase expondría. Crear `prisma/migrations/0002_proteger_migraciones/migration.sql`:

```sql
ALTER TABLE public._prisma_migrations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public._prisma_migrations FROM anon, authenticated;
```

```bash
npx prisma migrate deploy
```

Expected: `1 migration found` aplicada.

- [ ] **Step 5: Verificar en Supabase**

En el panel de Supabase → Advisors → Security Advisor: no debe aparecer ninguna tabla de `public` con "RLS disabled". Si aparece la advertencia de `search_path` en alguna función, revisar que ambas funciones tengan `SET search_path = ''`.

- [ ] **Step 6: Commit**

```bash
git add prisma/migrations
git commit -m "feat: migración inicial con restricciones, roles, trigger de alta y RLS" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Acceso a datos: Prisma, conexión privilegiada y `conUsuario`

**Files:**
- Create: `src/datos/prisma.ts`, `src/datos/cliente-usuario.ts`, `src/datos/privilegiado.ts`, `tests/integracion/entorno.ts`, `tests/integracion/ayudantes.ts`, `tests/integracion/alta-usuario.test.ts`

**Interfaces:**
- Consumes: modelos de la Task 4; trigger de la Task 5.
- Produces:
  - `type ClaimsUsuario = { sub: string; role: "authenticated"; email?: string }` y `type TxUsuario` (cliente de transacción de Prisma) en `@/datos/cliente-usuario`.
  - `conUsuario<T>(claims: ClaimsUsuario, fn: (tx: TxUsuario) => Promise<T>): Promise<T>`.
  - `prismaPrivilegiado` (PrismaClient sin RLS) y `supabaseAdmin()` (cliente de Supabase con la clave secreta) en `@/datos/privilegiado`.
  - En pruebas: `crearUsuarioPrueba(prefijo: string): Promise<string>` (devuelve el id), `borrarUsuarioPrueba(id: string): Promise<void>`, `claimsDe(id: string): ClaimsUsuario`, `asignarRol(id: string, rolId: 2 | 3): Promise<void>`.

- [ ] **Step 1: Instalar Supabase**

```bash
npm install @supabase/supabase-js@2
```

- [ ] **Step 2: Escribir la prueba que falla**

`tests/integracion/entorno.ts`:

```ts
import { config } from "dotenv";

config({ path: ".env.local" });
```

`tests/integracion/ayudantes.ts`:

```ts
import { randomUUID } from "node:crypto";
import type { ClaimsUsuario } from "@/datos/cliente-usuario";
import { prismaPrivilegiado, supabaseAdmin } from "@/datos/privilegiado";

export async function crearUsuarioPrueba(prefijo: string): Promise<string> {
  const email = `prueba-${prefijo}-${randomUUID().slice(0, 8)}@example.com`;
  const { data, error } = await supabaseAdmin().auth.admin.createUser({
    email,
    password: randomUUID(),
    email_confirm: true,
  });
  if (error || !data.user) throw new Error(`No se pudo crear el usuario de prueba: ${error?.message}`);
  return data.user.id;
}

export async function borrarUsuarioPrueba(id: string): Promise<void> {
  const { error } = await supabaseAdmin().auth.admin.deleteUser(id);
  if (error) throw new Error(`No se pudo borrar el usuario de prueba: ${error.message}`);
}

export function claimsDe(id: string): ClaimsUsuario {
  return { sub: id, role: "authenticated" };
}

export async function asignarRol(id: string, rolId: 2 | 3): Promise<void> {
  await prismaPrivilegiado.usuarioRol.create({ data: { usuarioId: id, rolId } });
}
```

`tests/integracion/alta-usuario.test.ts`:

```ts
import { afterAll, describe, expect, it } from "vitest";
import { conUsuario } from "@/datos/cliente-usuario";
import { prismaPrivilegiado } from "@/datos/privilegiado";
import { borrarUsuarioPrueba, claimsDe, crearUsuarioPrueba } from "./ayudantes";

const creados: string[] = [];
afterAll(async () => {
  for (const id of creados) await borrarUsuarioPrueba(id);
});

describe("alta automática del usuario (spec 4.3)", () => {
  it("crea la fila en usuario con el rol propietario", async () => {
    const id = await crearUsuarioPrueba("alta");
    creados.push(id);

    const usuario = await prismaPrivilegiado.usuario.findUnique({
      where: { id },
      include: { roles: { include: { rol: true } } },
    });
    expect(usuario?.roles.map((r) => r.rol.nombre)).toEqual(["propietario"]);
  });

  it("el usuario ve su propia fila y no la de otro", async () => {
    const a = await crearUsuarioPrueba("ver-a");
    const b = await crearUsuarioPrueba("ver-b");
    creados.push(a, b);

    const visibles = await conUsuario(claimsDe(a), (tx) => tx.usuario.findMany());
    expect(visibles.map((u) => u.id)).toEqual([a]);
  });

  it("al borrar la cuenta de autenticación se borra en cascada (RF-04)", async () => {
    const id = await crearUsuarioPrueba("cascada");
    await borrarUsuarioPrueba(id);
    expect(await prismaPrivilegiado.usuario.findUnique({ where: { id } })).toBeNull();
  });
});
```

- [ ] **Step 3: Verificar que falla**

Run: `npm run test:integracion`
Expected: FAIL, `Failed to resolve import "@/datos/cliente-usuario"`.

- [ ] **Step 4: Implementar el acceso a datos**

`src/datos/prisma.ts`:

```ts
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

function crearCliente(url: string | undefined) {
  if (!url) throw new Error("Falta la variable de entorno de conexión a la base de datos.");
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
}

const global = globalThis as unknown as { prismaApp?: PrismaClient };

/** Conexión de ejecución (pooler en modo transacción). Nunca se usa directo: ver conUsuario. */
export const prisma = global.prismaApp ?? crearCliente(process.env.DATABASE_URL);
if (process.env.NODE_ENV !== "production") global.prismaApp = prisma;
```

`src/datos/cliente-usuario.ts`:

```ts
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "./prisma";

export type ClaimsUsuario = { sub: string; role: "authenticated"; email?: string };
export type TxUsuario = Prisma.TransactionClient;

/**
 * Ejecuta `fn` en nombre del usuario: una transacción que adopta el rol `authenticated`
 * y carga los claims, de modo que auth.uid() y las políticas RLS se aplican (RNF-04).
 * Los claims tienen que salir de un token verificado en el servidor, nunca del navegador.
 */
export async function conUsuario<T>(
  claims: ClaimsUsuario,
  fn: (tx: TxUsuario) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT set_config('request.jwt.claims', ${JSON.stringify(claims)}, true)`;
    await tx.$executeRawUnsafe("SET LOCAL ROLE authenticated");
    return fn(tx);
  });
}
```

`src/datos/privilegiado.ts`:

```ts
import { PrismaPg } from "@prisma/adapter-pg";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Permisos de administrador: SIN RLS. Solo lo importan el seed, la eliminación de cuenta
 * (src/app/cuenta/acciones.ts) y las pruebas. ESLint lo impide en cualquier otro archivo.
 */
export const prismaPrivilegiado = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL }),
});

let admin: SupabaseClient | undefined;

export function supabaseAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.SUPABASE_SECRET_KEY;
  if (!url || !clave) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY.");
  admin ??= createClient(url, clave, { auth: { autoRefreshToken: false, persistSession: false } });
  return admin;
}
```

- [ ] **Step 5: Verificar que pasa**

Run: `npm run test:integracion`
Expected: PASS, 3 pruebas. Si falla con `permission denied for table usuario`, revisar que la migración incluya el `GRANT ... TO authenticated`.

- [ ] **Step 6: Commit**

```bash
git add src/datos tests/integracion package.json package-lock.json
git commit -m "feat: acceso a datos en nombre del usuario (conUsuario) y conexión privilegiada" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Pruebas de seguridad por fila (RNF-04)

Solo pruebas: la implementación son las políticas de la Task 5. Si alguna prueba falla, el error está en la migración y se corrige con una migración nueva (`0003_...`), nunca editando una ya aplicada.

**Files:**
- Create: `tests/integracion/rls-vehiculos.test.ts`, `tests/integracion/rls-catalogo.test.ts`

**Interfaces:**
- Consumes: `conUsuario`, `claimsDe`, `crearUsuarioPrueba`, `borrarUsuarioPrueba`, `asignarRol`, `prismaPrivilegiado`.

- [ ] **Step 1: Pruebas de vehículos y lecturas**

`tests/integracion/rls-vehiculos.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { conUsuario } from "@/datos/cliente-usuario";
import { borrarUsuarioPrueba, claimsDe, crearUsuarioPrueba } from "./ayudantes";

let a: string;
let b: string;
let vehiculoDeA: string;

beforeAll(async () => {
  a = await crearUsuarioPrueba("rls-a");
  b = await crearUsuarioPrueba("rls-b");
  const v = await conUsuario(claimsDe(a), (tx) =>
    tx.vehiculo.create({
      data: {
        usuarioId: a,
        marcaLibre: "Peugeot",
        modeloLibre: "208",
        anio: 2019,
        lecturas: { create: { kilometraje: 41000, fecha: new Date("2026-03-14") } },
      },
    }),
  );
  vehiculoDeA = v.id;
});

afterAll(async () => {
  await borrarUsuarioPrueba(a);
  await borrarUsuarioPrueba(b);
});

describe("RLS de vehículos y lecturas (RNF-04, OWASP A01)", () => {
  it("el dueño ve su vehículo y su lectura", async () => {
    const vs = await conUsuario(claimsDe(a), (tx) => tx.vehiculo.findMany({ include: { lecturas: true } }));
    expect(vs).toHaveLength(1);
    expect(vs[0]?.lecturas[0]?.kilometraje).toBe(41000);
  });

  it("otro usuario no ve el vehículo ni sus lecturas", async () => {
    const vs = await conUsuario(claimsDe(b), (tx) => tx.vehiculo.findMany());
    const ls = await conUsuario(claimsDe(b), (tx) => tx.lecturaKilometraje.findMany());
    expect(vs).toEqual([]);
    expect(ls).toEqual([]);
  });

  it("otro usuario no puede modificarlo ni borrarlo", async () => {
    const mod = await conUsuario(claimsDe(b), (tx) =>
      tx.vehiculo.updateMany({ where: { id: vehiculoDeA }, data: { anio: 2000 } }),
    );
    const bor = await conUsuario(claimsDe(b), (tx) =>
      tx.vehiculo.deleteMany({ where: { id: vehiculoDeA } }),
    );
    expect(mod.count).toBe(0);
    expect(bor.count).toBe(0);
  });

  it("otro usuario no puede crear un vehículo a nombre del dueño", async () => {
    await expect(
      conUsuario(claimsDe(b), (tx) =>
        tx.vehiculo.create({ data: { usuarioId: a, marcaLibre: "Fiat", modeloLibre: "Uno", anio: 2010 } }),
      ),
    ).rejects.toThrow();
  });

  it("otro usuario no puede agregar lecturas al vehículo ajeno", async () => {
    await expect(
      conUsuario(claimsDe(b), (tx) =>
        tx.lecturaKilometraje.create({
          data: { vehiculoId: vehiculoDeA, kilometraje: 99999, fecha: new Date("2026-03-15") },
        }),
      ),
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Pruebas del catálogo**

`tests/integracion/rls-catalogo.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { conUsuario } from "@/datos/cliente-usuario";
import { prismaPrivilegiado } from "@/datos/privilegiado";
import { asignarRol, borrarUsuarioPrueba, claimsDe, crearUsuarioPrueba } from "./ayudantes";

let propietario: string;
let admin: string;
let marcaId: number;
let modeloId: number;

beforeAll(async () => {
  propietario = await crearUsuarioPrueba("cat-prop");
  admin = await crearUsuarioPrueba("cat-admin");
  await asignarRol(admin, 2);
  const marca = await prismaPrivilegiado.marca.create({ data: { nombre: `Prueba ${Date.now()}` } });
  marcaId = marca.id;
  const modelo = await prismaPrivilegiado.modelo.create({
    data: {
      marcaId,
      nombre: "Modelo de prueba",
      anioDesde: 2020,
      planes: { create: [{ version: 1, estado: "publicado", fechaPublicacion: new Date() }, { version: 2, estado: "borrador" }] },
    },
  });
  modeloId = modelo.id;
});

afterAll(async () => {
  await prismaPrivilegiado.planMantenimiento.deleteMany({ where: { modeloId } });
  await prismaPrivilegiado.modelo.deleteMany({ where: { id: modeloId } });
  await prismaPrivilegiado.marca.deleteMany({ where: { id: marcaId } });
  await borrarUsuarioPrueba(propietario);
  await borrarUsuarioPrueba(admin);
});

describe("RLS del catálogo", () => {
  it("el propietario ve el plan publicado pero no el borrador", async () => {
    const planes = await conUsuario(claimsDe(propietario), (tx) =>
      tx.planMantenimiento.findMany({ where: { modeloId } }),
    );
    expect(planes.map((p) => p.version)).toEqual([1]);
  });

  it("el administrador de catálogo ve también el borrador", async () => {
    const planes = await conUsuario(claimsDe(admin), (tx) =>
      tx.planMantenimiento.findMany({ where: { modeloId }, orderBy: { version: "asc" } }),
    );
    expect(planes.map((p) => p.version)).toEqual([1, 2]);
  });

  it("el propietario no puede escribir el catálogo", async () => {
    await expect(
      conUsuario(claimsDe(propietario), (tx) => tx.marca.create({ data: { nombre: `Intrusa ${Date.now()}` } })),
    ).rejects.toThrow();
  });

  it("el administrador de catálogo sí puede", async () => {
    const m = await conUsuario(claimsDe(admin), (tx) =>
      tx.modelo.update({ where: { id: modeloId }, data: { anioHasta: 2024 } }),
    );
    expect(m.anioHasta).toBe(2024);
  });

  it("nadie puede darse un rol a sí mismo", async () => {
    await expect(
      conUsuario(claimsDe(propietario), (tx) =>
        tx.usuarioRol.create({ data: { usuarioId: propietario, rolId: 2 } }),
      ),
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 3: Ejecutar**

Run: `npm run test:integracion`
Expected: PASS, 13 pruebas en total (3 + 5 + 5).

- [ ] **Step 4: Commit**

```bash
git add tests/integracion
git commit -m "test: seguridad por fila de vehículos, lecturas, catálogo y roles" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Pruebas de las restricciones de la base (apartado 7.1.2)

**Files:**
- Create: `tests/integracion/restricciones.test.ts`

**Interfaces:**
- Consumes: `prismaPrivilegiado`, `crearUsuarioPrueba`, `borrarUsuarioPrueba`.

- [ ] **Step 1: Escribir las pruebas**

`tests/integracion/restricciones.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prismaPrivilegiado as db } from "@/datos/privilegiado";
import { borrarUsuarioPrueba, crearUsuarioPrueba } from "./ayudantes";

let usuario: string;
let vehiculo: string;
let marcaId: number;
let modeloId: number;
let itemId: number;

beforeAll(async () => {
  usuario = await crearUsuarioPrueba("restr");
  vehiculo = (await db.vehiculo.create({
    data: { usuarioId: usuario, marcaLibre: "Fiat", modeloLibre: "Uno", anio: 2010 },
  })).id;
  marcaId = (await db.marca.create({ data: { nombre: `Restr ${Date.now()}` } })).id;
  modeloId = (await db.modelo.create({ data: { marcaId, nombre: "M", anioDesde: 2010 } })).id;
  itemId = (await db.itemMantenimiento.create({ data: { modeloId, nombre: "Aceite", tipo: "reemplazo" } })).id;
});

afterAll(async () => {
  await db.intervaloPlan.deleteMany({ where: { itemId } });
  await db.planMantenimiento.deleteMany({ where: { modeloId } });
  await db.itemMantenimiento.deleteMany({ where: { modeloId } });
  await db.modelo.deleteMany({ where: { id: modeloId } });
  await db.marca.deleteMany({ where: { id: marcaId } });
  await borrarUsuarioPrueba(usuario);
});

describe("restricciones de verificación", () => {
  it("rechaza un kilometraje negativo", async () => {
    await expect(
      db.lecturaKilometraje.create({ data: { vehiculoId: vehiculo, kilometraje: -1, fecha: new Date() } }),
    ).rejects.toThrow(/lectura_km_no_negativo/);
  });

  it("acepta un auto 0 km", async () => {
    const l = await db.lecturaKilometraje.create({ data: { vehiculoId: vehiculo, kilometraje: 0, fecha: new Date() } });
    expect(l.kilometraje).toBe(0);
  });

  it("rechaza un vehículo con modelo del catálogo y además modelo libre", async () => {
    await expect(
      db.vehiculo.create({ data: { usuarioId: usuario, modeloId, marcaLibre: "X", modeloLibre: "Y", anio: 2012 } }),
    ).rejects.toThrow(/vehiculo_modelo_o_libre/);
  });

  it("rechaza un vehículo sin modelo de ningún tipo", async () => {
    await expect(db.vehiculo.create({ data: { usuarioId: usuario, anio: 2012 } })).rejects.toThrow(
      /vehiculo_modelo_o_libre/,
    );
  });

  it("rechaza un rango de años invertido", async () => {
    await expect(
      db.modelo.create({ data: { marcaId, nombre: "Invertido", anioDesde: 2020, anioHasta: 2010 } }),
    ).rejects.toThrow(/modelo_rango_anios/);
  });

  it("rechaza un intervalo nulo o negativo (RF-20)", async () => {
    const plan = await db.planMantenimiento.create({ data: { modeloId, version: 1, estado: "borrador" } });
    await expect(
      db.intervaloPlan.create({ data: { planId: plan.id, itemId, intervaloKm: 0 } }),
    ).rejects.toThrow(/intervalo_km_positivo/);
  });

  it("rechaza una intervención con ítem y descripción libre a la vez", async () => {
    await expect(
      db.intervencion.create({
        data: { vehiculoId: vehiculo, itemId, descripcionLibre: "Algo", origen: "registrada", kilometraje: 1000 },
      }),
    ).rejects.toThrow(/intervencion_item_o_descripcion/);
  });

  it("no admite dos planes publicados para el mismo modelo", async () => {
    await db.planMantenimiento.create({ data: { modeloId, version: 2, estado: "publicado", fechaPublicacion: new Date() } });
    await expect(
      db.planMantenimiento.create({ data: { modeloId, version: 3, estado: "publicado", fechaPublicacion: new Date() } }),
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Ejecutar**

Run: `npm run test:integracion`
Expected: PASS, 21 pruebas en total. Si alguna aserción de mensaje (`/nombre_restriccion/`) falla porque Prisma resume el error sin el nombre, cambiar esa aserción por `.rejects.toThrow()` y agregar en el mismo `it` una consulta privilegiada que confirme que la fila no se creó.

- [ ] **Step 3: Commit**

```bash
git add tests/integracion/restricciones.test.ts
git commit -m "test: restricciones de verificación de la base (apartado 7.1.2)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Seed del Ford Ka 2014

Intervalos verificados en `C:\Users\felip\Downloads\tesis felipe\KaGarantia2014-02.pdf`, págs. impresas 18–27. Los intervalos del filtro de aire, el filtro de combustible y las bujías no se pudieron extraer del PDF y **no se cargan** hasta verificarlos visualmente.

**Files:**
- Create: `prisma/cargar-entorno.ts`, `prisma/seed.ts`, `tests/integracion/seed.test.ts`

**Interfaces:**
- Consumes: `prismaPrivilegiado` (importado por ruta relativa, porque el seed corre fuera de Next).
- Produces: marca `Ford`, modelo `Ka` (2014–2014) con plan versión 1 `publicado` y 8 ítems; función exportada `sembrar(): Promise<void>`.

- [ ] **Step 1: Escribir la prueba que falla**

`tests/integracion/seed.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { prismaPrivilegiado as db } from "@/datos/privilegiado";
import { sembrar } from "../../prisma/seed";

describe("seed del Ford Ka 2014", () => {
  it("es idempotente y deja el plan publicado con 8 ítems", async () => {
    await sembrar();
    await sembrar();

    const modelos = await db.modelo.findMany({ where: { nombre: "Ka", marca: { nombre: "Ford" } } });
    expect(modelos).toHaveLength(1);

    const planes = await db.planMantenimiento.findMany({
      where: { modeloId: modelos[0]!.id },
      include: { intervalos: { include: { item: true } } },
    });
    expect(planes).toHaveLength(1);
    expect(planes[0]!.estado).toBe("publicado");
    expect(planes[0]!.intervalos).toHaveLength(8);

    const aceite = planes[0]!.intervalos.find((i) => i.item.nombre === "Aceite y filtro de aceite");
    expect(aceite).toMatchObject({ intervaloKm: 15000, intervaloMeses: 12 });
    expect(aceite!.item.tipo).toBe("reemplazo");

    const refrigerante = planes[0]!.intervalos.find((i) => i.item.nombre === "Líquido de enfriamiento");
    expect(refrigerante).toMatchObject({ intervaloKm: 90000, intervaloMeses: 36 });
  });
});
```

- [ ] **Step 2: Verificar que falla**

Run: `npx vitest run --project integracion tests/integracion/seed.test.ts`
Expected: FAIL, `Failed to resolve import "../../prisma/seed"`.

- [ ] **Step 3: Implementar el seed**

Los `import` de un módulo se evalúan antes que su cuerpo: si el seed llamara a `config()` después de importar `privilegiado`, la conexión se crearía sin `DIRECT_URL`. Por eso el entorno se carga en un módulo propio, importado primero.

`prisma/cargar-entorno.ts`:

```ts
import { config } from "dotenv";

config({ path: ".env.local" });
```

`prisma/seed.ts`:

```ts
import "./cargar-entorno";
import { prismaPrivilegiado as db } from "../src/datos/privilegiado";

type ItemSemilla = { nombre: string; tipo: "reemplazo" | "inspeccion"; km: number; meses: number | null };

/**
 * Programa de mantenimiento Ford - KA (KaGarantia2014-02.pdf, págs. impresas 18–27).
 * Ante contradicciones del manual se usa el intervalo más conservador (spec, apartado 7).
 */
const PLAN_KA: ItemSemilla[] = [
  // pág. 18: "Reemplazar cada 1 año ó 15.000 km"
  { nombre: "Aceite y filtro de aceite", tipo: "reemplazo", km: 15000, meses: 12 },
  // pág. 18: "Reemplazar el fluido cada 2 años ó 45.000 Km"
  { nombre: "Líquido de frenos", tipo: "reemplazo", km: 45000, meses: 24 },
  // pág. 19: "cada 3 años ó 90.000 Km"; pág. 25: "Cada 10 años o 105.000 km". Se usa el menor.
  { nombre: "Líquido de enfriamiento", tipo: "reemplazo", km: 90000, meses: 36 },
  // pág. 25: "Cada 5 años ó 90.000 km"
  { nombre: "Correa auxiliar", tipo: "reemplazo", km: 90000, meses: 60 },
  // págs. 26–27: se comprueba el desgaste en cada servicio de 15.000 km ó 1 año
  { nombre: "Pastillas de freno delanteras", tipo: "inspeccion", km: 15000, meses: 12 },
  // págs. 26–27: cintas de freno traseras cada 45.000 km ó 3 años
  { nombre: "Cintas de freno traseras", tipo: "inspeccion", km: 45000, meses: 36 },
  { nombre: "Amortiguadores", tipo: "inspeccion", km: 15000, meses: 12 },
  { nombre: "Neumáticos", tipo: "inspeccion", km: 15000, meses: 12 },
];

export async function sembrar(): Promise<void> {
  const ford = await db.marca.upsert({ where: { nombre: "Ford" }, update: {}, create: { nombre: "Ford" } });

  const existente = await db.modelo.findFirst({ where: { marcaId: ford.id, nombre: "Ka", anioDesde: 2014 } });
  const ka = existente ?? (await db.modelo.create({
    data: { marcaId: ford.id, nombre: "Ka", anioDesde: 2014, anioHasta: 2014 },
  }));

  const plan = await db.planMantenimiento.upsert({
    where: { modeloId_version: { modeloId: ka.id, version: 1 } },
    update: {},
    create: { modeloId: ka.id, version: 1, estado: "publicado", fechaPublicacion: new Date() },
  });

  for (const it of PLAN_KA) {
    const item = await db.itemMantenimiento.upsert({
      where: { modeloId_nombre: { modeloId: ka.id, nombre: it.nombre } },
      update: { tipo: it.tipo },
      create: { modeloId: ka.id, nombre: it.nombre, tipo: it.tipo },
    });
    await db.intervaloPlan.upsert({
      where: { planId_itemId: { planId: plan.id, itemId: item.id } },
      update: { intervaloKm: it.km, intervaloMeses: it.meses },
      create: { planId: plan.id, itemId: item.id, intervaloKm: it.km, intervaloMeses: it.meses },
    });
  }

  const email = process.env.ADMIN_EMAIL;
  const admin = email ? await db.usuario.findUnique({ where: { email } }) : null;
  if (!admin) {
    console.log("ADMIN_EMAIL todavía no tiene cuenta: registrate en la app y volvé a ejecutar el seed.");
    return;
  }
  for (const rolId of [2, 3]) {
    await db.usuarioRol.upsert({
      where: { usuarioId_rolId: { usuarioId: admin.id, rolId } },
      update: {},
      create: { usuarioId: admin.id, rolId },
    });
  }
  console.log("Roles de administrador asignados a ADMIN_EMAIL.");
}

if (process.argv[1]?.endsWith("seed.ts")) {
  sembrar()
    .then(() => db.$disconnect())
    .catch(async (e) => {
      console.error(e);
      await db.$disconnect();
      process.exit(1);
    });
}
```

- [ ] **Step 4: Verificar que pasa y ejecutar el seed real**

```bash
npx vitest run --project integracion tests/integracion/seed.test.ts
npx prisma db seed
```

Expected: la prueba PASA; el seed imprime `ADMIN_EMAIL todavía no tiene cuenta...` (es lo esperado: la cuenta se crea en el plan 1B).

- [ ] **Step 5: Commit**

```bash
git add prisma/cargar-entorno.ts prisma/seed.ts tests/integracion/seed.test.ts
git commit -m "feat: seed idempotente del Ford Ka 2014 con 8 ítems verificados del manual" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Integración continua, primer push y ajustes de la especificación

**Files:**
- Create: `.github/workflows/ci.yml`
- Modify: `docs/superpowers/specs/2026-10-05-iteracion-1-base-design.md` (apartados 4.4 y 7)

- [ ] **Step 1: Workflow de GitHub Actions**

`.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  verificar:
    runs-on: ubuntu-latest
    env:
      # prisma generate lee prisma.config.ts, que exige DIRECT_URL aunque no se conecte
      DIRECT_URL: postgresql://localhost:5432/ci
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm test
```

Las pruebas de integración no corren en CI todavía: necesitan los secretos del proyecto de Supabase, que se cargan en el plan 1E.

- [ ] **Step 2: Verificar localmente lo mismo que correrá CI**

```bash
npm run typecheck && npm run lint && npm test && npm run build
```

Expected: todo sin errores.

- [ ] **Step 3: Ajustar la especificación**

En `docs/superpowers/specs/2026-10-05-iteracion-1-base-design.md`:

- Apartado 4.4, reemplazar el párrafo que empieza con "**Ejecución "en nombre del usuario".** Una extensión de Prisma Client" por:

```markdown
**Ejecución "en nombre del usuario".** La función `conUsuario(claims, fn)` (`datos/cliente-usuario.ts`) abre una transacción interactiva de Prisma que:
1. ejecuta `SELECT set_config('request.jwt.claims', <claims JSON>, true)`;
2. ejecuta `SET LOCAL ROLE authenticated`;
3. ejecuta `fn`, que puede hacer varias consultas: todas quedan en la misma transacción, con RLS aplicado.

Se prefirió a una extensión que envuelve cada consulta suelta porque las operaciones de varios pasos (bloquear el vehículo, validar y guardar la lectura) tienen que ser atómicas (apartado 4.2).
```

- Apartado 4.4, en la tabla de políticas, reemplazar la fila de `PLAN_MANTENIMIENTO, INTERVALO_PLAN, ITEM_MANTENIMIENTO` por dos filas:

```markdown
| `PLAN_MANTENIMIENTO`, `INTERVALO_PLAN` | Autenticados: solo planes `publicado` y sus intervalos. Administrador de catálogo: todo | Administrador de catálogo |
| `ITEM_MANTENIMIENTO` | Cualquier usuario autenticado (el historial puede referenciar ítems de un plan reemplazado) | Administrador de catálogo |
```

- Apartado 7, reemplazar "Roles: `propietario`, `administrador_catalogo`, `administrador_tecnico`." por "Los roles se insertan en la migración inicial, porque el trigger de alta los necesita." y reemplazar "Marca Ford y modelo Ka (años según el manual)" por "Marca Ford y modelo Ka, años 2014–2014 (lo que respalda el manual; ampliar solo con verificación)".

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml docs/superpowers/specs/2026-10-05-iteracion-1-base-design.md
git diff --cached | grep -iE "sb_secret|sb_publishable|postgres(ql)?://[^:]+:[^@]+@" && echo "CLAVE DETECTADA: no commitear" || echo "sin claves"
git commit -m "ci: tipos, lint y pruebas unitarias en cada push; spec actualizada" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: `sin claves`.

- [ ] **Step 5: Primer push (con confirmación de Felipe)**

El repositorio es público: **preguntar a Felipe antes de este paso**. Con su confirmación:

```bash
git log --oneline
git push -u origin main
gh run watch --exit-status
```

Expected: el workflow `CI` termina en verde.

---

## Criterio de terminado del plan 1A

1. `npm run typecheck`, `npm run lint`, `npm test` y `npm run build` sin errores.
2. `npm run test:integracion`: 22 pruebas en verde contra el proyecto de Supabase de desarrollo.
3. El Security Advisor de Supabase no reporta tablas sin RLS.
4. El workflow `CI` en verde en GitHub.
5. La especificación refleja los cuatro ajustes de este plan.
