# Iteración 1E — Cierre: punta a punta, correo y despliegue: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cerrar la Iteración 1 con su criterio de terminado (spec, apartado 11): prueba de punta a punta con Playwright, correos reales en español enviados por Resend, la aplicación desplegada en Vercel con despliegue continuo (RNF-13) y las pruebas de integración y de punta a punta corriendo en la integración continua.

**Architecture:** Tres partes. **A (código, un PR):** origen de la aplicación para las vistas previas, prueba de punta a punta, integración continua con secretos y la configuración del despliegue. **B (infraestructura, la hace Felipe guiado):** proyecto de Supabase de producción, Vercel, protección de `main` y retiro de las claves heredadas. **C (cierre, un segundo PR):** recorrido en producción, README y cambios para el informe. Ese segundo PR recorre el camino completo de RNF-13 (PR → CI en verde → merge → despliegue automático) y sirve de prueba.

**Tech Stack:** Playwright 1.64, GitHub Actions, Vercel (plan Hobby), Resend (SMTP), Supabase (dos proyectos: desarrollo y producción), Prisma 7.

**Spec:** `docs/superpowers/specs/2026-10-05-iteracion-1-base-design.md`, apartados 2 (infraestructura), 5 (correo), 8 (pruebas), 9 (integración continua) y 11 (criterio de terminado) · Informe: 6.1.2 ("Infraestructura y despliegue") y Tabla 6 (RNF-11, RNF-13).

## Global Constraints

- Todo lo de los planes 1A a 1D sigue vigente.
- **Secretos:** las claves van solo en `.env.local`, en `.env.produccion.local`, en los secretos del repositorio y en las variables de Vercel. Nunca en el código, en el chat ni en la salida de un comando. Felipe las carga él mismo; el agente solo verifica que existan, sin mostrarlas.
- **El correo real de Felipe no va al repositorio** (es público). La prueba de punta a punta usa direcciones de prueba de Resend (`delivered+<etiqueta>@resend.dev`): Resend acepta el envío y lo da por entregado sin mandarlo a nadie.
- No se prueba "Eliminar mi cuenta" con la cuenta real de Felipe.
- Antes de cada push: escaneo de secretos y confirmación de Felipe.
- Los pasos en paneles web (Resend, Supabase, Vercel, DNS) los hace Felipe. El agente le dicta cada valor y **se detiene** hasta que confirme.
- Región: todo en São Paulo (Supabase `sa-east-1`, funciones de Vercel en `gru1`). Cada operación abre una transacción interactiva (`conUsuario`) con varios viajes a la base, así que tener las funciones en otro continente multiplicaría la latencia (RNF-01).

## Decisiones

- **Vistas previas por rama (informe, 6.1.2: "cada rama genera un entorno de vista previa aislado"):** activadas, contra el proyecto de Supabase de **desarrollo**. Producción solo se despliega desde `main`. El origen de los enlaces de correo sale de `APP_ORIGIN` y, si no está (vistas previas), de `VERCEL_BRANCH_URL`, que la pone Vercel y no viene de la solicitud, así que la protección contra la inyección del encabezado `Host` sigue en pie.
- **Plantillas de correo con `{{ .RedirectTo }}`** en vez de `{{ .SiteURL }}` (ajuste de las plantillas del plan 1B): el enlace vuelve al mismo entorno donde se pidió (local, vista previa o producción). Supabase solo acepta un `RedirectTo` que figure en las Redirect URLs.
- **Migraciones en el build de Vercel** (`prisma migrate deploy && next build`): en producción migran la base de producción y en las vistas previas, la de desarrollo. Si el build falla después de migrar, la base queda adelantada respecto del código. Con migraciones que solo agregan es inocuo. *Nota para la TFI:* migraciones en un paso propio del pipeline, con el patrón expandir y contraer.
- **RNF-13:** a `main` solo se llega por PR con los checks `verificar`, `integracion` y `e2e` en verde y la rama al día (`strict`). También rige para los administradores. Vercel despliega producción en cada cambio de `main`, y `next build` falla si no compila (RNF-11).
- **Fuera de este plan, para avisar:** RNF-08 (respaldo semanal, cuatro copias) no lo cubre el plan gratuito de Supabase. Se propone para la Iteración 2: un job semanal de GitHub Actions con `pg_dump` de producción, cifrado con una frase secreta y guardado 28 días. Cifrado, porque los artefactos de un repositorio público los puede descargar cualquiera.

## Mapa de archivos

| Archivo | Responsabilidad |
|---|---|
| `src/lib/origen.ts` | `origenDeLaApp(env)`: `APP_ORIGIN`, si no la URL de la rama en Vercel, si no `localhost` |
| `src/app/(auth)/acciones.ts` | `enlaceDeVuelta` usa `origenDeLaApp()` |
| `tests/unit/origen.test.ts` | Pruebas de `origenDeLaApp` |
| `playwright.config.ts` | Proyecto `celular` (Pixel 7), servidor de desarrollo local o build en CI |
| `tests/e2e/ayudantes.ts` | Enlace de confirmación con la API de administración; limpieza |
| `tests/e2e/recorrido-propietario.spec.ts` | Registro → confirmación → salida e ingreso → alta del Ka → kilometraje → rechazo → `/admin` 404 → eliminar la cuenta |
| `.github/workflows/ci.yml` | Jobs `verificar`, `integracion` y `e2e` |
| `vercel.json` | Región `gru1` y comando de build |
| `package.json` | Scripts `test:e2e` y `build:vercel`; `@playwright/test` |
| `prisma.config.ts`, `prisma/cargar-entorno.ts` | Archivo de entorno elegible con `ARCHIVO_ENTORNO` (producción) |
| `.gitignore` | Salidas de Playwright |
| `README.md` | Cómo correr, probar y desplegar (en español) |
| `docs/cambios-para-el-informe.md` | Lo que el Módulo 4 tiene que ajustar respecto del informe |

## Preparación

- [ ] **Rama:** con el PR de la 1D mergeado, `git checkout main && git pull && git checkout -b iteracion-1e-cierre`. Primer commit: este plan (`docs: plan de implementación 1E (cierre)`).

---

## Parte A — Código

### Task 1: Correo con Resend y plantillas en español (Felipe, guiado)

Sin código. Hace falta antes de la Task 3: con el servidor de correo por defecto, Supabase solo envía a las direcciones del equipo del proyecto, y el registro de la prueba de punta a punta fallaría.

- [ ] **Step 1: Dominio** — Felipe elige el subdominio de envío: `avisos.<su dominio>`. Es un subdominio, para no comprometer la reputación del dominio principal.
- [ ] **Step 2: Cuenta y dominio en Resend** — resend.com → crear la cuenta → Domains → Add Domain → `avisos.<su dominio>`, región **São Paulo (sa-east-1)**. Cargar en el DNS del dominio los registros que muestra Resend (MX y TXT de SPF para `send.avisos`, TXT de DKIM `resend._domainkey.avisos`). Recomendado: TXT `_dmarc.<su dominio>` = `v=DMARC1; p=none;`. Esperar el estado **Verified**.
- [ ] **Step 3: Clave para desarrollo** — Resend → API Keys → Create: nombre `supabase-dev`, permiso **Sending access**, dominio `avisos.<su dominio>`. Se copia directo al paso siguiente y no se pega en ningún otro lado.
- [ ] **Step 4: SMTP en Supabase de desarrollo** — Authentication → Emails → SMTP Settings → Enable custom SMTP:
  - Sender email: `no-responder@avisos.<su dominio>` · Sender name: `Libreta de service`
  - Host: `smtp.resend.com` · Port: `465` · Username: `resend` · Password: la clave del Step 3
- [ ] **Step 5: Redirect URLs de desarrollo** — Authentication → URL Configuration → Redirect URLs. Dejar `http://localhost:3000/**` y agregar `https://mantenimiento-vehicular-git-*.vercel.app/**` (vistas previas por rama).
- [ ] **Step 6: Plantillas** — Authentication → Emails → Templates. Reemplazan a las del plan 1B, Task 1, Step 4: usan `{{ .RedirectTo }}`, que ya trae `/auth/confirmar?next=…`.

**Confirm signup** · Asunto: `Confirmá tu cuenta en Libreta de service`

```html
<h2>Confirmá tu cuenta</h2>
<p>Hola. Para activar tu cuenta en Libreta de service, abrí este enlace:</p>
<p><a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email">Confirmar mi cuenta</a></p>
<p>Si no creaste una cuenta, ignorá este correo.</p>
```

**Reset password** · Asunto: `Elegí una contraseña nueva`

```html
<h2>Recuperar contraseña</h2>
<p>Pediste elegir una contraseña nueva para Libreta de service. El enlace sirve una sola vez:</p>
<p><a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=recovery">Elegir contraseña nueva</a></p>
<p>Si no lo pediste, ignorá este correo: tu contraseña no cambia.</p>
```

- [ ] **Step 7: Prueba manual** — en `http://localhost:3000`, con el servidor de desarrollo:
  1. Crear una cuenta con un alias de su Gmail (`<usuario>+prueba1@gmail.com`; Gmail lo entrega en su bandeja). El correo llega en español, desde "Libreta de service".
  2. Copiar el enlace y abrirlo en **otro navegador** (Edge): tiene que entrar a "Mis vehículos". Así se comprueba que `token_hash` no depende del navegador, a diferencia de PKCE.
  3. Cerrar sesión → "Olvidé mi contraseña" con el alias → abrir el correo → elegir la contraseña nueva → entra.
  4. Mi cuenta → Eliminar mi cuenta, con la contraseña nueva. La cuenta del alias es descartable.

  Si un enlace lleva a `/ingresar?enlace=invalido`, revisar que la Redirect URL del Step 5 esté guardada (sin ella, `RedirectTo` cae en el Site URL y el enlace queda mal armado).

---

### Task 2: Origen de la aplicación para las vistas previas

**Files:**
- Create: `src/lib/origen.ts`, `tests/unit/origen.test.ts`
- Modify: `src/app/(auth)/acciones.ts:24-33`

**Interfaces:**
- Produces: `origenDeLaApp(env?: Record<string, string | undefined>): string`

- [ ] **Step 1: Prueba que falla** — `tests/unit/origen.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { origenDeLaApp } from "@/lib/origen";

describe("origenDeLaApp", () => {
  it("usa APP_ORIGIN cuando está definida", () => {
    expect(
      origenDeLaApp({ APP_ORIGIN: "https://libreta.example", VERCEL_BRANCH_URL: "rama.vercel.app" }),
    ).toBe("https://libreta.example");
  });

  it("en una vista previa de Vercel usa la URL de la rama, con https", () => {
    expect(origenDeLaApp({ VERCEL_BRANCH_URL: "mantenimiento-vehicular-git-rama.vercel.app" })).toBe(
      "https://mantenimiento-vehicular-git-rama.vercel.app",
    );
  });

  it("sin ninguna de las dos, es el servidor local", () => {
    expect(origenDeLaApp({})).toBe("http://localhost:3000");
  });
});
```

- [ ] **Step 2: Verificar que falla** — `npx vitest run --project unit tests/unit/origen.test.ts` → FAIL ("Cannot find module '@/lib/origen'" o similar).

- [ ] **Step 3: Implementación** — `src/lib/origen.ts`:

```ts
/**
 * Origen público de la aplicación, para los enlaces de los correos. Nunca sale de la
 * solicitud (inyección del encabezado Host): APP_ORIGIN en local y en producción;
 * en las vistas previas, la URL estable de la rama, que la pone Vercel.
 */
export function origenDeLaApp(env: Record<string, string | undefined> = process.env): string {
  if (env.APP_ORIGIN) return env.APP_ORIGIN;
  if (env.VERCEL_BRANCH_URL) return `https://${env.VERCEL_BRANCH_URL}`;
  return "http://localhost:3000";
}
```

En `src/app/(auth)/acciones.ts`, importar `import { origenDeLaApp } from "@/lib/origen";` y dejar `enlaceDeVuelta` así (el comentario de arriba de la función se mantiene, cambiando "APP_ORIGIN" por "origenDeLaApp()" si lo menciona):

```ts
function enlaceDeVuelta(destino: "/vehiculos" | "/recuperar/nueva"): string {
  return `${origenDeLaApp()}/auth/confirmar?next=${encodeURIComponent(destino)}`;
}
```

- [ ] **Step 4: Verificar** — `npx vitest run --project unit` → 49 pasan. `npm run typecheck` y `npm run lint` limpios.

- [ ] **Step 5: Commit** — `git add src/lib/origen.ts tests/unit/origen.test.ts "src/app/(auth)/acciones.ts"` · `git commit -m "feat: origen de los enlaces de correo en las vistas previas de Vercel"`

---

### Task 3: Prueba de punta a punta con Playwright

**Files:**
- Create: `playwright.config.ts`, `tests/e2e/ayudantes.ts`, `tests/e2e/recorrido-propietario.spec.ts`
- Modify: `package.json` (script y dependencia), `.gitignore`

**Interfaces:**
- Consumes: pantallas de los planes 1B y 1C (textos exactos más abajo); `/auth/confirmar` acepta `token_hash` y `type`.
- Produces: `npm run test:e2e`.

- [ ] **Step 1: Instalar** — `npm install -D @playwright/test@1.64.0` y `npx playwright install chromium`.

- [ ] **Step 2: Script y `.gitignore`** — en `package.json`, `scripts`: `"test:e2e": "playwright test"`. Al final de `.gitignore`:

```
# Playwright
/test-results/
/playwright-report/
/blob-report/
```

- [ ] **Step 3: Configuración** — `playwright.config.ts`:

```ts
import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

const enCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: enCI,
  reporter: enCI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://localhost:3000",
    locale: "es-AR",
    timezoneId: "America/Argentina/Buenos_Aires",
    trace: "retain-on-failure",
  },
  // Diseño primero para celular (RNF-10).
  projects: [{ name: "celular", use: { ...devices["Pixel 7"] } }],
  webServer: {
    command: enCI ? "npm run build && npm run start" : "npm run dev",
    url: "http://localhost:3000/ingresar",
    reuseExistingServer: !enCI,
    timeout: 240_000,
  },
});
```

- [ ] **Step 4: Ayudantes** — `tests/e2e/ayudantes.ts`:

```ts
import { createClient } from "@supabase/supabase-js";

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.SUPABASE_SECRET_KEY;
  if (!url || !clave) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY.");
  return createClient(url, clave, { auth: { autoRefreshToken: false, persistSession: false } });
}

/**
 * Enlace de confirmación sin leer el correo (spec, apartado 8). Para un usuario existente sin
 * confirmar, `generateLink` de tipo signup emite un token nuevo y no envía nada.
 */
export async function enlaceDeConfirmacion(
  email: string,
  contrasena: string,
): Promise<{ ruta: string; usuarioId: string }> {
  const { data, error } = await admin().auth.admin.generateLink({ type: "signup", email, password: contrasena });
  if (error) throw new Error(`No se pudo generar el enlace: ${error.message}`);
  return {
    ruta: `/auth/confirmar?token_hash=${data.properties.hashed_token}&type=signup&next=%2Fvehiculos`,
    usuarioId: data.user.id,
  };
}

export async function existeUsuario(id: string): Promise<boolean> {
  const { data } = await admin().auth.admin.getUserById(id);
  return Boolean(data.user);
}

/** Si la prueba falló a mitad de camino, borra la cuenta que haya quedado. */
export async function borrarSiQuedo(email: string): Promise<void> {
  const { data } = await admin().auth.admin.listUsers({ perPage: 1000 });
  const usuario = data.users.find((u) => u.email === email);
  if (usuario) await admin().auth.admin.deleteUser(usuario.id);
}
```

- [ ] **Step 5: La prueba** — `tests/e2e/recorrido-propietario.spec.ts`:

```ts
import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { borrarSiQuedo, enlaceDeConfirmacion, existeUsuario } from "./ayudantes";

// Dirección de prueba de Resend: el envío es real, pero no le llega a nadie.
const email = `delivered+e2e-${Date.now()}@resend.dev`;
const contrasena = `e2e-${randomUUID()}`;

test.afterAll(async () => {
  await borrarSiQuedo(email);
});

test("propietario: cuenta, vehículo, kilometraje y baja", async ({ page }) => {
  let usuarioId = "";

  await test.step("CU-01: crear la cuenta y confirmarla", async () => {
    await page.goto("/crear-cuenta");
    await page.getByLabel("Correo electrónico").fill(email);
    await page.getByLabel("Contraseña", { exact: true }).fill(contrasena);
    await page.getByRole("button", { name: "Crear cuenta" }).click();
    await expect(page.getByRole("heading", { name: "Revisá tu correo" })).toBeVisible();

    const enlace = await enlaceDeConfirmacion(email, contrasena);
    usuarioId = enlace.usuarioId;
    await page.goto(enlace.ruta);
    await expect(page.getByRole("heading", { name: "Mis vehículos" })).toBeVisible();
  });

  await test.step("CU-02: cerrar sesión e ingresar", async () => {
    await page.getByRole("link", { name: "Mi cuenta" }).click();
    await page.getByRole("button", { name: "Cerrar sesión" }).click();
    await expect(page.getByRole("heading", { name: "Ingresar" })).toBeVisible();
    await page.getByLabel("Correo electrónico").fill(email);
    await page.getByLabel("Contraseña", { exact: true }).fill(contrasena);
    await page.getByRole("button", { name: "Ingresar" }).click();
    await expect(page.getByRole("heading", { name: "Mis vehículos" })).toBeVisible();
  });

  await test.step("CU-05: agregar un Ford Ka 2014", async () => {
    await page.getByRole("link", { name: "Agregar vehículo" }).click();
    await page.getByLabel("Marca").selectOption({ label: "Ford" });
    await page.getByLabel("Modelo").selectOption({ label: "Ka" });
    await page.getByLabel("Año").selectOption("2014");
    await page.getByLabel("Kilometraje actual").fill("45000");
    await page.getByRole("button", { name: "Agregar vehículo" }).click();
    await expect(page.getByRole("heading", { name: "Ford Ka 2014" })).toBeVisible();
    await expect(page.getByText("45.000 km", { exact: true })).toBeVisible();
  });

  const dialogo = page.getByRole("dialog");

  await test.step("CU-08: actualizar el kilometraje", async () => {
    await page.getByRole("button", { name: "Actualizar kilometraje" }).click();
    await dialogo.getByLabel("Kilometraje actual").fill("47500");
    await dialogo.getByRole("button", { name: "Guardar" }).click();
    await expect(dialogo).toBeHidden();
    await expect(page.getByText("47.500 km", { exact: true })).toBeVisible();
  });

  await test.step("CU-08 4a: rechazar una lectura menor", async () => {
    await page.getByRole("button", { name: "Actualizar kilometraje" }).click();
    await dialogo.getByLabel("Kilometraje actual").fill("47000");
    await dialogo.getByRole("button", { name: "Guardar" }).click();
    await expect(dialogo.getByText("No puede ser menor a 47.500 km, la última lectura.")).toBeVisible();
    await page.keyboard.press("Escape");
  });

  await test.step("Un propietario no ve la administración", async () => {
    const respuesta = await page.goto("/admin");
    expect(respuesta?.status()).toBe(404);
  });

  await test.step("CU-04: eliminar la cuenta", async () => {
    await page.goto("/cuenta");
    await page.getByRole("button", { name: "Eliminar mi cuenta" }).click();
    await dialogo.getByLabel("Ingresá tu contraseña para confirmar").fill(contrasena);
    await dialogo.getByRole("button", { name: "Eliminar cuenta" }).click();
    await expect(page).toHaveURL(/\/ingresar\?cuenta=eliminada/);
    expect(await existeUsuario(usuarioId)).toBe(false);
  });
});
```

- [ ] **Step 6: Correr** — con la red del celular (la de la facultad bloquea la base), `npm run test:e2e`. Si el servidor de desarrollo ya está levantado, Playwright lo reusa. Esperado: `1 passed`. Si falla, `npx playwright show-trace test-results/**/trace.zip` muestra el paso. Una falla en `/admin` por el código 404 se analiza aparte: `notFound()` en un layout tiene que responder 404; si Next responde 200 por el streaming, se reemplaza la aserción del estado por `await expect(page.getByText("This page could not be found.")).toBeVisible()` y se anota el motivo en el commit.

- [ ] **Step 7: Verificar el resto** — `npm run typecheck`, `npm run lint`, `npm test` (49) en verde. Las pruebas de integración no cambian.

- [ ] **Step 8: Commit** — `git add playwright.config.ts tests/e2e package.json package-lock.json .gitignore` · `git commit -m "test: recorrido de punta a punta del propietario con Playwright"`

---

### Task 4: Integración continua con integración y punta a punta

**Files:**
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Secretos del repositorio** — los cinco del proyecto de Supabase de **desarrollo**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `DATABASE_URL` y `DIRECT_URL`. Con la confirmación de Felipe, el agente los carga desde `.env.local` sin mostrarlos (el valor viaja por la entrada estándar y no queda en la línea de comandos):

```bash
for n in NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY SUPABASE_SECRET_KEY DATABASE_URL DIRECT_URL; do
  grep -E "^$n=" .env.local | head -1 | cut -d= -f2- | sed -E 's/^"(.*)"$/\1/' | tr -d '\r\n' | gh secret set "$n" >/dev/null && echo "$n cargado"
done
gh secret list
```

Esperado: cinco "cargado" y la lista con los cinco nombres (`gh secret list` no muestra valores).

- [ ] **Step 2: Workflow** — `.github/workflows/ci.yml` completo:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

# Un push nuevo a la misma rama cancela la corrida anterior.
concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

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

  # Integración y punta a punta usan el proyecto de Supabase de desarrollo.
  # Un PR desde un fork no recibe secretos: estos jobs se saltean.
  integracion:
    needs: verificar
    if: github.event_name == 'push' || github.event.pull_request.head.repo.full_name == github.repository
    runs-on: ubuntu-latest
    env:
      NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY }}
      SUPABASE_SECRET_KEY: ${{ secrets.SUPABASE_SECRET_KEY }}
      DATABASE_URL: ${{ secrets.DATABASE_URL }}
      DIRECT_URL: ${{ secrets.DIRECT_URL }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm run test:integracion

  e2e:
    needs: integracion
    if: github.event_name == 'push' || github.event.pull_request.head.repo.full_name == github.repository
    runs-on: ubuntu-latest
    env:
      NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY }}
      SUPABASE_SECRET_KEY: ${{ secrets.SUPABASE_SECRET_KEY }}
      DATABASE_URL: ${{ secrets.DATABASE_URL }}
      DIRECT_URL: ${{ secrets.DIRECT_URL }}
      APP_ORIGIN: http://localhost:3000
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
      # El informe y la traza solo usan la cuenta descartable de la prueba.
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
```

- [ ] **Step 3: Commit** — `git add .github/workflows/ci.yml` · `git commit -m "ci: pruebas de integración y de punta a punta con secretos"`. Se comprueba en el PR de la Task 5.

---

### Task 5: Preparar el despliegue y PR de la Parte A

**Files:**
- Create: `vercel.json`
- Modify: `package.json`, `prisma.config.ts`, `prisma/cargar-entorno.ts`, `.env.example`

- [ ] **Step 1: `vercel.json`**

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "regions": ["gru1"],
  "buildCommand": "npm run build:vercel"
}
```

En `package.json`, `scripts`: `"build:vercel": "prisma migrate deploy && next build"`.

- [ ] **Step 2: Archivo de entorno elegible** — para correr las migraciones y el seed contra producción desde la máquina de Felipe sin tocar `.env.local`. En `prisma/cargar-entorno.ts` y en `prisma.config.ts`, reemplazar `config({ path: ".env.local", quiet: true });` por:

```ts
// ARCHIVO_ENTORNO=.env.produccion.local apunta la CLI y el seed a producción.
config({ path: process.env.ARCHIVO_ENTORNO ?? ".env.local", quiet: true });
```

Al final de `.env.example`:

```
# En Vercel no hace falta APP_ORIGIN en las vistas previas: se usa VERCEL_BRANCH_URL.
# Para producción desde esta máquina: copiar este archivo a .env.produccion.local con los
# valores del proyecto de producción y anteponer ARCHIVO_ENTORNO=.env.produccion.local.
```

- [ ] **Step 3: Verificar** — `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` y `npx prisma migrate status` (con `.env.local`: "Database schema is up to date!").

- [ ] **Step 4: Commit** — `git add vercel.json package.json prisma.config.ts prisma/cargar-entorno.ts .env.example` · `git commit -m "build: configuración de Vercel (São Paulo, migraciones en el build)"`

- [ ] **Step 5: PR** — escaneo de secretos sobre `git diff origin/main..HEAD` (correo real de Felipe, `sb_secret_`, `sb_publishable_`, `eyJhbGci`, cadenas `postgres://usuario:clave@`). Con la confirmación de Felipe: push y `gh pr create --title "Iteración 1E: punta a punta y despliegue"`. Los tres jobs tienen que quedar en verde; el de punta a punta envía un correo real por Resend a `delivered+…@resend.dev`. Merge cuando esté en verde.

---

## Parte B — Infraestructura (Felipe, guiado)

### Task 6: Supabase de producción y Vercel

- [ ] **Step 1: Proyecto** — Supabase → New project: `mantenimiento-vehicular-prod`, región **South America (São Paulo)**, contraseña de la base solo con letras y números (como en desarrollo, para evitar problemas de codificación en la URL).
- [ ] **Step 2: Auth** — los mismos valores que el plan 1B, Task 1, Steps 2 y 3 (Confirm email, largo mínimo 8, rotación de tokens de actualización, JWT de 3600 s, claves de firma asimétricas). URL Configuration: Site URL `https://mantenimiento-vehicular.vercel.app` (o el dominio que asigne Vercel en el Step 6) y Redirect URLs `https://mantenimiento-vehicular.vercel.app/**`.
- [ ] **Step 3: Correo** — Resend → nueva clave `supabase-prod` (Sending access, mismo dominio) → SMTP de este proyecto con los valores de la Task 1, Step 4 → las dos plantillas de la Task 1, Step 6.
- [ ] **Step 4: `.env.produccion.local`** — Felipe copia `.env.example` a `.env.produccion.local` y lo completa con los valores de **producción** (las dos URL del pooler, las claves, `ADMIN_EMAIL` con su correo y `APP_ORIGIN=https://mantenimiento-vehicular.vercel.app`). El agente verifica, sin mostrar valores, que estén las siete variables y que el archivo esté ignorado: `git check-ignore .env.produccion.local`.
- [ ] **Step 5: Vercel** — vercel.com → cuenta con GitHub → Add New → Project → importar `felipemassone/mantenimiento-vehicular`. Framework: Next.js (detectado); el build sale de `vercel.json`. Environment Variables:
  - **Production:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` (marcada como *Sensitive*), `DATABASE_URL`, `DIRECT_URL`, `APP_ORIGIN`, todas de producción.
  - **Preview:** las mismas cinco primeras, de **desarrollo**, sin `APP_ORIGIN`.
- [ ] **Step 6: Primer despliegue** — Deploy. El build corre `prisma migrate deploy` contra producción (en el log: "All migrations have been successfully applied" con las dos migraciones) y después `next build`. Si el dominio asignado no es `mantenimiento-vehicular.vercel.app`, corregir `APP_ORIGIN` en Vercel, el Site URL y las Redirect URLs de Supabase de producción y `.env.produccion.local`, y volver a desplegar (Deployments → Redeploy).
- [ ] **Step 7: Seed del catálogo** — el agente ejecuta `ARCHIVO_ENTORNO=.env.produccion.local npx prisma db seed`. Esperado: el Ka 2014 con 8 ítems y el aviso "ADMIN_EMAIL todavía no tiene cuenta".
- [ ] **Step 8: Esquema igual a la Figura 7 (criterio 4)** — `ARCHIVO_ENTORNO=.env.produccion.local npx prisma migrate status` → "Database schema is up to date!", y `ARCHIVO_ENTORNO=.env.produccion.local npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma` → sin diferencias. El esquema ya se comparó con la Figura 7 entidad por entidad en el plan 1A, así que coincidir con `schema.prisma` equivale a coincidir con la figura.
- [ ] **Step 9: Cuenta de administrador** — Felipe crea su cuenta en producción con su correo real, desde el celular, y confirma con el enlace (llega por Resend). Después, el agente vuelve a correr el seed del Step 7 → "Roles de administrador asignados a ADMIN_EMAIL". Felipe cierra sesión y vuelve a entrar: aparece "Cambiar a Administración".

### Task 7: RNF-13 — `main` solo con PR y checks en verde

- [ ] **Step 1: Protección de la rama** — con la confirmación de Felipe (es configuración persistente del repositorio):

```bash
gh api -X PUT repos/felipemassone/mantenimiento-vehicular/branches/main/protection --input - <<'EOF'
{
  "required_status_checks": { "strict": true, "contexts": ["verificar", "integracion", "e2e"] },
  "enforce_admins": true,
  "required_pull_request_reviews": { "required_approving_review_count": 0 },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
EOF
```

- [ ] **Step 2: Comprobar** — `gh api repos/felipemassone/mantenimiento-vehicular/branches/main/protection --jq '.required_status_checks.contexts, .enforce_admins.enabled'` → `["verificar","integracion","e2e"]` y `true`. La prueba en uso es el PR de la Task 9: no se puede mergear hasta que los tres checks estén en verde.
- [ ] **Step 3: Forma de trabajo** — desde acá, también los documentos (planes, ajustes de la spec) llegan a `main` por PR.

### Task 8: Retirar las claves heredadas

Primero las claves de API heredadas (`anon` y `service_role`), que son JWT firmados con el secreto heredado; después el secreto. La app usa las claves nuevas (`sb_publishable_…`, `sb_secret_…`), así que no se afecta.

- [ ] **Step 1: Desarrollo** — Project Settings → API Keys → pestaña de claves heredadas → **Disable JWT-based API keys**. Project Settings → JWT Keys → la clave heredada (HS256, "Previously used") → **Revoke**.
- [ ] **Step 2: Verificar desarrollo** — `npm run test:integracion` → 50 pasan, y en `localhost:3000` ingresar y salir funciona.
- [ ] **Step 3: Producción** — lo mismo, si el proyecto nuevo trae claves heredadas. Verificar ingresando en `https://mantenimiento-vehicular.vercel.app`.

---

## Parte C — Cierre

### Task 9: Recorrido en producción, documentación y PR final

**Files:**
- Modify: `README.md`, `docs/superpowers/specs/2026-10-05-iteracion-1-base-design.md`
- Create: `docs/cambios-para-el-informe.md`

- [ ] **Step 1: Recorrido en producción (criterio 2)** — Felipe, en el celular, en `https://mantenimiento-vehicular.vercel.app` con su cuenta: agregar un Ford Ka 2014, actualizar el kilometraje, ver el rechazo de una lectura menor; "Olvidé mi contraseña" con el correo real (llega por Resend en español); en Administración, la tabla con el Ka publicado. Y con un alias de Gmail: crear una cuenta, confirmarla y eliminarla.

- [ ] **Step 2: README** — `README.md` completo:

````markdown
# Libreta de service

Plataforma web de mantenimiento programado vehicular. Proyecto del Seminario de Práctica de
Ingeniería en Software (Universidad Siglo 21). Producción: https://mantenimiento-vehicular.vercel.app

## Stack

Next.js 16 (App Router, Server Actions) · React 19 · TypeScript estricto · Tailwind 4 y
shadcn/ui · Prisma 7 · Supabase (PostgreSQL, Auth) · Zod 4 · Vitest · Playwright ·
GitHub Actions · Vercel · Resend.

## Arquitectura

- `src/app`: presentación (páginas y Server Actions). No importa Prisma.
- `src/dominio`: reglas sin dependencias de frameworks.
- `src/datos`: único acceso a la base. Toda operación pasa por `conUsuario(claims, fn)`, que
  abre una transacción con el rol `authenticated` y los claims del usuario: la seguridad a
  nivel de fila de PostgreSQL se aplica siempre (RNF-04). `privilegiado.ts` es la única
  excepción (seed, eliminar cuenta y pruebas).
- ESLint hace cumplir estas reglas.

## Correr en local

1. `npm install`
2. Copiar `.env.example` a `.env.local` y completar con el proyecto de Supabase de desarrollo.
3. `npx prisma migrate deploy` y `npx prisma db seed`
4. `npm run dev` → http://localhost:3000

## Pruebas

| Comando | Qué corre |
|---|---|
| `npm test` | Unitarias (dominio) |
| `npm run test:integracion` | Integración contra Supabase de desarrollo: RLS, restricciones, trigger, publicación |
| `npm run test:e2e` | Punta a punta con Playwright, en un celular emulado |

La prueba de punta a punta crea una cuenta con una dirección de prueba de Resend y la elimina
al final.

## Despliegue (RNF-13)

- `main` solo acepta cambios por pull request con `verificar` (tipos, lint y unitarias),
  `integracion` y `e2e` en verde, y con la rama al día.
- Cada cambio en `main` se despliega a producción en Vercel. El build aplica las migraciones
  pendientes (`prisma migrate deploy`) y compila; si no compila, no se despliega (RNF-11).
- Cada rama tiene su vista previa en Vercel, contra el proyecto de Supabase de desarrollo.
- Funciones en São Paulo (`gru1`), junto a la base.

Para correr la CLI de Prisma o el seed contra producción:
`ARCHIVO_ENTORNO=.env.produccion.local npx prisma db seed`
````

- [ ] **Step 3: Cambios para el informe** — `docs/cambios-para-el-informe.md`:

```markdown
# Cambios para el informe (Módulo 4)

Regla de la spec: el código y el informe no pueden decir cosas distintas. Lo que se apartó del
informe en la Iteración 1:

| Apartado del informe | Dice | Quedó | Ajuste de redacción |
|---|---|---|---|
| 6.1.2, capa de aplicación | "las rutas de API de Next.js exponen las operaciones" | Las operaciones son Server Actions; la única ruta es `/auth/confirmar` | "las acciones de servidor (Server Actions) y las rutas de Next.js exponen las operaciones" |

Comprobado sin diferencias: modelo de datos (Figura 7) contra el esquema desplegado; RNF-04
(RLS en cada consulta); RNF-05 (token de 60 minutos y rotación del de actualización); RNF-11
y RNF-13 (6.1.2, "Infraestructura y despliegue": despliegue automático desde `main` y vista
previa por rama).

Para avisar: RNF-08 (respaldo semanal) no lo cubre el plan gratuito de Supabase; se resuelve
en la Iteración 2.
```

- [ ] **Step 4: Spec** — en el apartado 5 de la spec, al final de "Enlaces del correo", agregar: "*Ajuste del plan 1E:* las plantillas usan `{{ .RedirectTo }}` (que ya trae `/auth/confirmar?next=…`) en vez de `{{ .SiteURL }}`, para que el enlace vuelva al entorno donde se pidió: local, vista previa o producción." En el apartado 9, reemplazar "RNF-13 (desplegar solo si compila y pasan las pruebas) se configura junto con Vercel." por "RNF-13: `main` protegida (PR con `verificar`, `integracion` y `e2e` en verde, rama al día, también para administradores); Vercel despliega cada cambio de `main` y migra en el build. Vistas previas por rama contra el proyecto de desarrollo."

- [ ] **Step 5: Criterio de terminado** — repasar el apartado 11 de la spec punto por punto, con evidencia: (1) los tres jobs en verde en el PR; (2) el Step 1 de esta task; (3) `verificar`; (4) Task 6, Step 8; (5) el Step 3 de esta task.

- [ ] **Step 6: PR final y prueba de RNF-13** — rama `iteracion-1e-documentacion` desde `main`, commit `docs: README, cambios para el informe y ajustes de la spec (1E)`, escaneo de secretos, confirmación de Felipe, push, PR. Con los tres checks en verde, merge. En Vercel → Deployments, aparece un despliegue de producción del commit del merge, en estado Ready.

- [ ] **Step 7: Fuera del repositorio** — actualizar la memoria (`anteproyecto_mantenimiento_vehicular.md`), `contexto-proyecto-mantenimiento-auto.md` y Notion con el cierre de la Iteración 1, la URL de producción y lo pendiente (RNF-08 en la Iteración 2; diseños de la Iteración 2 antes de programarla).

## Notas para la tesis final

- Migraciones en un paso propio del pipeline, antes del despliegue, con expandir y contraer.
- Prueba de punta a punta también en Firefox y WebKit (RNF-09) y del panel de administración.
- Base de datos efímera por PR (rama de Supabase) en vez de compartir la de desarrollo.
- Página 404 propia en español.
