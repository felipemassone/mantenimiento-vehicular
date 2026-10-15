# Iteración 3E — Punta a punta, verificación en producción y cierre: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cerrar la Iteración 3: el recorrido de punta a punta suma el registro de un trabajo con comprobante (CU-10, CU-11, CU-13, CU-12), `docs/cambios-para-el-informe.md` queda completo para la Iteración 3 y Felipe verifica en producción, desde el celular, el criterio de terminado de la spec.

**Architecture:** Sin código de la app nuevo. La e2e (`tests/e2e/recorrido-propietario.spec.ts`) recorre las pantallas 15 a 17 con una imagen PNG de 1×1 generada en memoria; los ayudantes (`tests/e2e/ayudantes.ts`) cuentan los archivos de la carpeta del usuario en el bucket con la clave secreta, para comprobar que eliminar el trabajo y la cuenta no deja archivos.

**Tech Stack:** Playwright (Pixel 7), Supabase Storage (admin), GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-10-13-iteracion-3-registro-design.md`, apartados 8, 9 y 10.

## Global Constraints

- La e2e corre en el CI contra la base de desarrollo, con la cuenta descartable de siempre; si falla a mitad de camino, `borrarSiQuedo` también vacía su carpeta de comprobantes.
- La fecha del trabajo es el día de hoy en Argentina (`America/Argentina/Buenos_Aires`), igual que `fechaDeHoy`.
- La verificación en producción la hace Felipe desde el celular, con su cuenta; la cuenta de prueba para el rol de catálogo es descartable y se borra al final.

## Review Focus

1. **Registrar el cambio de aceite con 82.000 km:** el aceite deja de estar "Vencido" y "A confirmar" y pasa a "Al día", con el aviso de CU-10 paso 7 (Task 1).
2. **El comprobante se ve:** el detalle muestra la imagen cargada desde el enlace firmado, no solo el `<img>` (Task 1).
3. **Eliminar el trabajo:** desaparece del historial, el aceite vuelve a "Vencido" con el supuesto, y el archivo ya no está en el bucket (Task 1).
4. **Eliminar la cuenta con un comprobante guardado:** la carpeta del usuario queda vacía (deuda del plan 3B, Task 1).

## Mapa de archivos

| Archivo | Responsabilidad |
|---|---|
| `tests/e2e/ayudantes.ts` | `archivosDelUsuario`; `borrarSiQuedo` vacía la carpeta |
| `tests/e2e/recorrido-propietario.spec.ts` | Pasos CU-10/CU-11, CU-13 y CU-12 |
| `docs/cambios-para-el-informe.md` | Evidencia y cambios de la Iteración 3 |

## Preparación

- [ ] Con el PR #21 mergeado: `git checkout main && git pull && git checkout -b iteracion-3e-cierre`. Primer commit: este plan.

---

### Task 1: Recorrido de punta a punta con un trabajo y su comprobante

**Files:**
- Modify: `tests/e2e/ayudantes.ts`, `tests/e2e/recorrido-propietario.spec.ts`

- [ ] **Step 1: Ayudantes** — `archivosDelUsuario(usuarioId): Promise<number>` lista `comprobantes/{usuarioId}` con la clave secreta; `borrarSiQuedo` borra esos archivos antes de borrar la cuenta.
- [ ] **Step 2: Pasos nuevos**, después de "CU-08 4a" y antes de "Un propietario no ve la administración":
  - "CU-10 y CU-11": desde la ficha, "Registrar trabajo" → "Del plan", "Aceite y filtro de aceite", fecha de hoy, 82000 km, taller y costo, comprobante PNG → "Guardar trabajo". En la ficha: aviso "Con el trabajo registrado cambió el estado de 1 ítem: Aceite y filtro de aceite, ahora al día."; la fila del aceite muestra "Al día" y no "A confirmar".
  - "CU-13": "Historial" → la fila del aceite con el ícono "Con comprobante" (y la de neumáticos como dato del alta) → detalle con la imagen cargada (`naturalWidth > 0`).
  - "CU-12": "Eliminar trabajo" y confirmar → historial sin el aceite; carpeta sin archivos; la ficha vuelve a "Vencido" y "A confirmar".
  - "RF-14": registrar un "Otro trabajo" con comprobante, que queda guardado para el paso de la cuenta.
  - "CU-04": después de eliminar la cuenta, `archivosDelUsuario` devuelve 0.
- [ ] **Step 3: Verificar** — `npm run test:e2e` local (la base de desarrollo responde fuera de la red de la facultad) → PASS; typecheck y lint.
- [ ] **Step 4: Commit** — `test: la e2e registra, ve y elimina un trabajo con comprobante (CU-10 a CU-13)`

### Task 2: `docs/cambios-para-el-informe.md`

- [ ] Cotejar la sección "Iteración 3" con los planes 3A a 3D y con la spec (apartados 3 a 5): que cada desvío esté y que haya evidencia como en la Iteración 2 (RNF-07, RNF-13, e2e, verificación en producción).
- [ ] Actualizar la nota de restauración del respaldo (RNF-08): pasa a la tesis final (spec 11).
- [ ] Commit `docs: cambios y evidencia de la Iteración 3 para el informe`.

### Task 3: PR, CI y despliegue

- [ ] Push, PR con los tres checks en verde, merge; el job `desplegar` publica en producción.

### Task 4: Verificación en producción (Felipe, desde el celular)

- [ ] Registrar un trabajo del plan en un vehículo propio: el ítem pasa a "Al día" y aparece en el historial (Tabla 8).
- [ ] Adjuntar una foto del comprobante y verla en el detalle.
- [ ] Como administrador técnico, en `/admin/usuarios`, dar y quitar "administrador de catálogo" a una cuenta de prueba; con el rol, la cuenta entra al catálogo; sin él, no.
- [ ] Anotar la evidencia en `docs/cambios-para-el-informe.md` (commit directo en un PR chico) y borrar la cuenta de prueba.

### Cierre

- [ ] Actualizar `contexto-proyecto-mantenimiento-auto.md`, la memoria del proyecto y el hub de Notion: Iteración 3 terminada.
