# Iteración 2E — Aviso de cambios, rendimiento, respaldo y cierre: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cerrar la Iteración 2: el aviso de cambios después de actualizar el kilometraje (CU-08 paso 7, mockup 14), el recorrido de punta a punta completo, la medición de RNF-01 en producción, el respaldo semanal cifrado (RNF-08) y la documentación para el informe.

**Architecture:** El texto del aviso es puro (`textoCambios` en `src/dominio/vista-estado.ts`). `actualizarKilometraje` devuelve los cambios que ya calcula `registrarLectura` (2B); un contexto de cliente en la ficha los guarda solo mientras dura esa visita, para mostrar el aviso y marcar las filas con la línea oro. RNF-01 se mide registrando la duración de `estadoDelVehiculo` en los logs de Vercel. El respaldo es un workflow de GitHub Actions en el entorno `produccion`.

**Tech Stack:** Next.js 16, React 19, Tailwind 4, Vitest, Playwright, GitHub Actions, PostgreSQL 17 (`pg_dump`), GnuPG.

**Spec:** `docs/superpowers/specs/2026-10-12-iteracion-2-motor-design.md`, apartados 4.4, 5 (aviso de cambios), 6, 7 y 9 · `DESIGN.md` (oro: "indicador de la fila seleccionada") · Mockup `docs/diseno/pantallas/mobile/14`.

## Global Constraints

- Texto del aviso: "Con {km} km cambió el estado de {N} ítem(s): {ítem}, ahora {estado}; …." Estados: "vencido", "próximo", "al día". Sin cambios, no hay aviso.
- El aviso y la línea oro se ven solo en la respuesta a esa actualización; al volver a entrar a la ficha no están (spec 5).
- La línea oro es de 2 px a la izquierda de la fila, con el token `oro`. El oro nunca es texto ni fondo (DESIGN.md).
- RNF-01: promedio de 20 consultas de estado en producción, medido en el servidor, menor a 500 ms (spec 9.3).
- Respaldo: domingos 06:00 UTC y a mano; entorno `produccion` limitado a la rama `main`; `pg_dump` 17 en formato custom de `public` y `auth`; cifrado con `gpg` simétrico; verificado con `pg_restore --list`; artefacto con retención de 28 días (spec 7).
- Las claves nunca se imprimen ni se suben al repositorio. `RESPALDO_FRASE` la elige y guarda Felipe.

## Review Focus

1. **Varios cambios en una misma lectura:** el aviso los nombra todos, en el orden de la ficha, con singular y plural correctos (Task 1).
2. **Una lectura sin cambios o rechazada:** no aparece aviso ni línea oro; un aviso anterior desaparece (Task 2).
3. **Volver a entrar a la ficha o recargarla:** el aviso no está (Task 2).
4. **El respaldo falla a mitad de camino:** el job termina en rojo y no sube un archivo sin cifrar ni uno que no se pudo verificar (Task 4).
5. **Un PR intenta leer los secretos del respaldo:** el entorno `produccion` no se lo permite (Task 4).

## Mapa de archivos

| Archivo | Responsabilidad |
|---|---|
| `src/dominio/vista-estado.ts` | `textoCambios` |
| `src/app/(propietario)/vehiculos/acciones.ts` | `actualizarKilometraje` devuelve `cambios` y `km` |
| `src/app/(propietario)/vehiculos/[id]/cambios.tsx` | Contexto de cliente: `ProveedorCambios`, `AvisoCambios`, `FilaItem` |
| `src/app/(propietario)/vehiculos/[id]/kilometraje.tsx` | Publica los cambios al guardar |
| `src/app/(propietario)/vehiculos/[id]/page.tsx` | Usa el contexto |
| `src/datos/estado.ts` | Registra la duración de `estadoDelVehiculo` (RNF-01) |
| `.github/workflows/respaldo.yml`, `README.md` | Respaldo y restauración (RNF-08) |
| `docs/cambios-para-el-informe.md` | Evidencia y cambios para el Módulo 4 |
| `tests/unit/vista-estado.test.ts`, `tests/e2e/recorrido-propietario.spec.ts` | Pruebas |

## Preparación

- [ ] Con el PR del 2D mergeado: `git checkout main && git pull && git checkout -b iteracion-2e-cierre`. Primer commit: este plan.

---

### Task 1: Texto del aviso

**Files:**
- Modify: `src/dominio/vista-estado.ts`, `tests/unit/vista-estado.test.ts`

**Interfaces:**
- Consumes: `type Cambio = { itemId: number; nombre: string; estado: Estado }` de `@/dominio/motor`; `formatearKm`.
- Produces: `textoCambios(km: number, cambios: Pick<Cambio, "nombre" | "estado">[]): string | null`.

- [ ] **Step 1: Prueba que falla** — sumar a `tests/unit/vista-estado.test.ts` (y `textoCambios` al import):

```ts
describe("textoCambios (CU-08 paso 7, mockup 14)", () => {
  it("un cambio, en singular", () => {
    expect(textoCambios(75300, [{ nombre: "Aceite y filtro de aceite", estado: "vencido" }])).toBe(
      "Con 75.300 km cambió el estado de 1 ítem: Aceite y filtro de aceite, ahora vencido.",
    );
  });
  it("varios, en plural y en el orden recibido", () => {
    expect(
      textoCambios(82000, [
        { nombre: "Correa auxiliar", estado: "proximo" },
        { nombre: "Líquido de enfriamiento", estado: "al_dia" },
      ]),
    ).toBe(
      "Con 82.000 km cambió el estado de 2 ítems: Correa auxiliar, ahora próximo; Líquido de enfriamiento, ahora al día.",
    );
  });
  it("sin cambios no hay aviso", () => {
    expect(textoCambios(82000, [])).toBeNull();
  });
});
```

- [ ] **Step 2: Verificar que falla** — `npx vitest run --project unit tests/unit/vista-estado.test.ts` → FAIL (`textoCambios` no existe).

- [ ] **Step 3: Implementación** — en `src/dominio/vista-estado.ts` (import de `formatearKm` desde `@/dominio/kilometraje` y del tipo `Cambio`):

```ts
const ESTADO_EN_TEXTO: Record<Estado, string> = { vencido: "vencido", proximo: "próximo", al_dia: "al día" };

/** Mockup 14: "Con 75.300 km cambió el estado de 1 ítem: Aceite y filtro de aceite, ahora vencido." */
export function textoCambios(km: number, cambios: Pick<Cambio, "nombre" | "estado">[]): string | null {
  if (cambios.length === 0) return null;
  const lista = cambios.map((c) => `${c.nombre}, ahora ${ESTADO_EN_TEXTO[c.estado]}`).join("; ");
  return `Con ${formatearKm(km)} km cambió el estado de ${contar(cambios.length, "ítem", "ítems")}: ${lista}.`;
}
```

- [ ] **Step 4: Verificar** — el mismo comando → PASS.

- [ ] **Step 5: Commit** — `git add src/dominio/vista-estado.ts tests/unit/vista-estado.test.ts` · `git commit -m "feat: texto del aviso de cambios (CU-08 paso 7, mockup 14)"`

---

### Task 2: Aviso de cambios en la ficha y recorrido de punta a punta

**Files:**
- Create: `src/app/(propietario)/vehiculos/[id]/cambios.tsx`
- Modify: `src/app/(propietario)/vehiculos/acciones.ts`, `…/[id]/kilometraje.tsx`, `…/[id]/page.tsx`, `tests/e2e/recorrido-propietario.spec.ts`

**Interfaces:**
- Consumes: `textoCambios` (Task 1); `registrarLectura(...): Resultado<{ cambios: Cambio[] }>`.
- Produces: `EstadoVehiculo = { errores?: ErroresCampo; ok?: true; cambios?: Cambio[]; km?: number }`.

- [ ] **Step 1: Prueba que falla (corre en el CI)** — en `tests/e2e/recorrido-propietario.spec.ts`:
  - Paso "CU-08": la lectura pasa de `47500` a `82000` (cruza el 90 % de la correa auxiliar y del líquido de enfriamiento, cada 90.000 km). Reemplazar la aserción de "47.500 km" por:

```ts
    await expect(page.getByText("82.000 km", { exact: true })).toBeVisible();
    // CU-08 paso 7 (mockup 14): el aviso nombra lo que cambió, y no vuelve al recargar.
    await expect(
      page.getByText(
        "Con 82.000 km cambió el estado de 2 ítems: Correa auxiliar, ahora próximo; Líquido de enfriamiento, ahora próximo.",
      ),
    ).toBeVisible();
    await page.reload();
    await expect(page.getByText(/^Con 82\.000 km cambió/)).toHaveCount(0);
```

  - Paso "CU-08 4a": la lectura rechazada pasa de `47000` a `81000` y el mensaje esperado a "No puede ser menor a 82.000 km, la última lectura."
  - Paso "CU-05" (deuda del 2D): antes de `await expect(neumaticos.getByText("A confirmar")).toHaveCount(0);` sumar `await expect(neumaticos).toHaveCount(1);`.

- [ ] **Step 2: Verificar que falla** — en el CI del PR (FAIL en el aviso). Localmente: typecheck y lint.

- [ ] **Step 3: Acción** — en `src/app/(propietario)/vehiculos/acciones.ts`: `import type { Cambio } from "@/dominio/motor";`, el tipo `EstadoVehiculo` suma `cambios?: Cambio[]; km?: number`, y `actualizarKilometraje` termina con `return { ok: true, cambios: r.valor.cambios, km };`.

- [ ] **Step 4: Contexto** — `src/app/(propietario)/vehiculos/[id]/cambios.tsx`:

```tsx
"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { Aviso } from "@/components/aviso";
import type { Cambio } from "@/dominio/motor";
import { textoCambios } from "@/dominio/vista-estado";
import { cn } from "@/lib/utils";

type Ultimos = { km: number; cambios: Cambio[] } | null;
const Contexto = createContext<{ ultimos: Ultimos; publicar: (u: Ultimos) => void }>({
  ultimos: null,
  publicar: () => {},
});

/** CU-08 paso 7: los cambios de la última lectura viven solo mientras dura esta visita a la ficha. */
export function ProveedorCambios({ children }: { children: ReactNode }) {
  const [ultimos, publicar] = useState<Ultimos>(null);
  return <Contexto.Provider value={{ ultimos, publicar }}>{children}</Contexto.Provider>;
}

export function usePublicarCambios() {
  return useContext(Contexto).publicar;
}

export function AvisoCambios() {
  const { ultimos } = useContext(Contexto);
  const texto = ultimos && textoCambios(ultimos.km, ultimos.cambios);
  return texto ? (
    <div className="mt-4">
      <Aviso tipo="info">{texto}</Aviso>
    </div>
  ) : null;
}

/** Fila de la sección Mantenimiento; la línea oro marca lo que cambió con la última lectura (mockup 14). */
export function FilaItem({ itemId, className, children }: { itemId: number; className: string; children: ReactNode }) {
  const { ultimos } = useContext(Contexto);
  const cambio = ultimos?.cambios.some((c) => c.itemId === itemId);
  return <li className={cn(className, cambio && "shadow-[inset_2px_0_0_0_var(--color-oro)]")}>{children}</li>;
}
```

- [ ] **Step 5: Diálogo** — en `kilometraje.tsx`: `const publicar = usePublicarCambios();` y, en el `useActionState`, `publicar(r.ok && r.km !== undefined ? { km: r.km, cambios: r.cambios ?? [] } : null);` antes de cerrar. Así una lectura rechazada o sin cambios borra el aviso anterior.

- [ ] **Step 6: Ficha** — en `page.tsx`: envolver el contenido de la `<section>` en `<ProveedorCambios>`; `<AvisoCambios />` justo después de `<ActualizarKilometraje …/>`; cada `<li>` de `estado.items` pasa a `<FilaItem itemId={i.itemId} className={cn(…las mismas clases…)}>`.

- [ ] **Step 7: Verificar** — `npm run typecheck`, `npm run lint`, `npm run test:cobertura`; verificación visual con cuenta temporal (Ka con 62.400 km → 74.000 km: aviso con los ítems que pasan a próximo, línea oro en esas filas, contra el mockup 14; una lectura menor no deja aviso; recargar lo borra; 375 y 1280 px sin desborde).

- [ ] **Step 8: Commit** — `git add src tests` · `git commit -m "feat: aviso de cambios después de actualizar el kilometraje (CU-08 paso 7, mockup 14)"`

---

### Task 3: Registro de la duración del estado (RNF-01)

**Files:**
- Modify: `src/datos/estado.ts`

- [ ] **Step 1: Implementación** — en `estadoDelVehiculo`, medir con `performance.now()` alrededor de la transacción y registrar `console.info(\`[RNF-01] estadoDelVehiculo ${Math.round(ms)} ms\`)` (sin ids ni datos del usuario). Es instrumentación, no comportamiento: sin prueba nueva (Ruling en el ledger).

- [ ] **Step 2: Verificar** — `npm run typecheck`, `npm run lint`, `npx vitest run --project integracion tests/integracion/estado.test.ts` (sigue pasando; la línea aparece en la salida).

- [ ] **Step 3: Commit** — `git add src/datos/estado.ts` · `git commit -m "feat: registro de la duración del cálculo de estado (RNF-01)"`

---

### Task 4: Respaldo semanal cifrado (RNF-08)

**Files:**
- Create: `.github/workflows/respaldo.yml`
- Modify: `README.md`

- [ ] **Step 1: Comprobar el acceso a `auth`** — con la `DIRECT_URL` de `.env.produccion.local` (sin imprimirla), consultar `select has_schema_privilege('auth','USAGE'), has_table_privilege('auth.users','SELECT')` y `show server_version`. Si no hay acceso a `auth`, el respaldo cubre `public` y se anota en `docs/cambios-para-el-informe.md`.

- [ ] **Step 2: Workflow** — `.github/workflows/respaldo.yml`:

```yaml
name: Respaldo

# RNF-08: respaldo completo semanal de producción, cifrado, con las cuatro últimas copias (spec 7).
on:
  schedule:
    - cron: "0 6 * * 0"
  workflow_dispatch:

permissions:
  contents: read

jobs:
  respaldo:
    runs-on: ubuntu-latest
    environment: produccion
    steps:
      - name: Instalar el cliente de PostgreSQL 17
        run: |
          sudo install -d /usr/share/postgresql-common/pgdg
          sudo curl -fsSL -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc https://www.postgresql.org/media/keys/ACCC4CF8.asc
          echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" | sudo tee /etc/apt/sources.list.d/pgdg.list > /dev/null
          sudo apt-get update -qq
          sudo apt-get install -y -qq postgresql-client-17

      - name: Volcar, cifrar y verificar
        env:
          PROD_DIRECT_URL: ${{ secrets.PROD_DIRECT_URL }}
          RESPALDO_FRASE: ${{ secrets.RESPALDO_FRASE }}
        run: |
          set -euo pipefail
          bin=/usr/lib/postgresql/17/bin
          nombre="respaldo-$(date -u +%Y-%m-%d)"
          "$bin/pg_dump" "$PROD_DIRECT_URL" --format=custom --no-owner --no-privileges \
            --schema=public --schema=auth --file "$nombre.dump"
          gpg --batch --yes --pinentry-mode loopback --passphrase-fd 3 --symmetric --cipher-algo AES256 \
            --output "$nombre.dump.gpg" "$nombre.dump" 3<<< "$RESPALDO_FRASE"
          rm "$nombre.dump"
          # Verificación: se descifra y pg_restore lee el índice completo.
          gpg --batch --pinentry-mode loopback --passphrase-fd 3 --decrypt --output verificar.dump "$nombre.dump.gpg" 3<<< "$RESPALDO_FRASE"
          "$bin/pg_restore" --list verificar.dump > /dev/null
          rm verificar.dump
          echo "NOMBRE=$nombre" >> "$GITHUB_ENV"

      - uses: actions/upload-artifact@v4
        with:
          name: ${{ env.NOMBRE }}
          path: ${{ env.NOMBRE }}.dump.gpg
          retention-days: 28
          if-no-files-found: error
```

  (Si el Step 1 dio que no hay acceso a `auth`, sacar `--schema=auth`.)

- [ ] **Step 3: Entorno y secretos — FRENAR y pedirle a Felipe:**
  - Limitar el entorno `produccion` (ya existe: lo crea el job `desplegar`) a la rama `main` por nombre, antes de cargar ningún secreto: `gh api -X PUT repos/felipemassone/mantenimiento-vehicular/environments/produccion --input` con `{"deployment_branch_policy":{"protected_branches":false,"custom_branch_policies":true}}` y `gh api -X POST …/environments/produccion/deployment-branch-policies -f name=main -f type=branch` (con su visto bueno).
  - `PROD_DIRECT_URL`: `gh secret set PROD_DIRECT_URL --env produccion` leyendo la `DIRECT_URL` de `.env.produccion.local` por stdin, sin imprimirla (con su visto bueno).
  - `RESPALDO_FRASE`: la elige Felipe, la guarda en su gestor de contraseñas y la carga él en GitHub → Settings → Environments → produccion. Sin ella los respaldos no se pueden abrir.

- [ ] **Step 4: README** — sección "Respaldo y restauración": qué se respalda y cuándo, dónde están los artefactos (Actions → Respaldo → la corrida → Artifacts), y la restauración:

```bash
gpg --decrypt respaldo-AAAA-MM-DD.dump.gpg > respaldo.dump
pg_restore --list respaldo.dump
pg_restore --clean --if-exists --no-owner --dbname "$DESTINO" respaldo.dump
```

  con la advertencia de restaurar en un proyecto de Supabase nuevo (no sobre producción) y la nota de que GitHub apaga los workflows programados tras 60 días sin actividad en el repositorio.

- [ ] **Step 5: Commit** — `git add .github/workflows/respaldo.yml README.md` · `git commit -m "feat: respaldo semanal cifrado de producción (RNF-08)"`

---

### Task 5: PR, mediciones en producción y cierre

- [ ] **Step 1: PR y merge** — escaneo de secretos; push; `gh pr create --title "Iteración 2E: aviso de cambios, rendimiento, respaldo y cierre"`; revisión final; merge con los checks en verde.
- [ ] **Step 2: Respaldo a mano** — `gh workflow run respaldo.yml --ref main`; esperar la corrida; comprobar que terminó en verde y que el artefacto existe (`gh run view … --json`). Criterio 9.4.
- [ ] **Step 3: RNF-01 — FRENAR y pedirle a Felipe** que abra la ficha de su Ka en producción 20 veces (recargar); en paralelo, `vercel logs` de producción filtrando `[RNF-01]`; promedio y máximo. Criterio 9.3.
- [ ] **Step 4: Criterio 9.2 — pedirle a Felipe** que confirme desde el celular un supuesto de su Ka en producción.
- [ ] **Step 5: Documentación** — `docs/cambios-para-el-informe.md`: medición de RNF-01 (promedio, máximo, fecha); respaldo con GitHub Actions en lugar del plan pago de Supabase; chip "a verificar" en la lista; aviso de cambios; cualquier limitación del Step 1 de la Task 4. Commit y PR de documentación.
- [ ] **Step 6: Memoria y Notion** — actualizar la memoria del proyecto (Iteración 2 cerrada, pendientes para la Iteración 3) y el hub de Notion.
