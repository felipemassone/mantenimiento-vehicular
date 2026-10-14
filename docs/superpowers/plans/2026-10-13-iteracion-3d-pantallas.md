# Iteración 3D — Pantallas de registro, historial y roles: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Las pantallas 15 a 18 sobre la capa de datos de 3A, 3B y 3C: registrar y editar un trabajo con comprobante (CU-10, CU-11, CU-12), ver el historial y el detalle (CU-13), administrar el rol de catálogo (CU-18), y los accesos "Registrar trabajo" e "Historial" en la ficha.

**Architecture:** Páginas de servidor bajo `/vehiculos/[id]/` (`registrar`, `historial`, `historial/[trabajo]`, `historial/[trabajo]/editar`) y `/admin/usuarios`. Un solo formulario cliente (`formulario-trabajo.tsx`) sirve para registrar y editar; al enviar, sube el comprobante con `subirComprobante` (navegador → Storage) y manda solo la ruta a la acción de servidor, que llama a `registrarTrabajo` / `editarTrabajo` de `src/datos/comprobantes.ts`. El aviso de cambios de la ficha (CU-10 paso 7) viaja en la URL (`?cambios=3,5`) y la ficha lo arma con el estado ya recalculado. El formato de costo, tamaño y textos es dominio puro, con pruebas primero.

**Tech Stack:** Next.js 16 (App Router, Server Actions, `useActionState`), React 19, Tailwind 4, Supabase Storage (cliente del navegador), Vitest.

**Spec:** `docs/superpowers/specs/2026-10-13-iteracion-3-registro-design.md`, apartados 3, 4, 5 y 7. Diseños: `docs/diseno/pantallas/mobile/15`, `16`, `17` y `web/18`; colores y componentes de `DESIGN.md` (no del `tailwind.config` de los `code.html`).

## Global Constraints

- Un solo botón azul por pantalla (DESIGN.md). En la ficha pasa a ser "Registrar trabajo" (mockup 06); "Actualizar kilometraje", "Historial" y "Editar datos" quedan secundarios.
- El `<input type="file">` **no tiene `name`**: el archivo nunca viaja a la acción de servidor (Vercel Hobby corta a 4,5 MB). La subida ocurre al enviar, no al elegir (plan 3B).
- Validación inmediata del archivo al elegirlo (CU-11 2a) con `validarArchivo`; el servidor vuelve a validar.
- React 19 reinicia el formulario después de cada acción: la acción devuelve `valores` y los campos los usan como valor inicial; el archivo elegido vive en el estado de React.
- Solo los trabajos `registrada` muestran "Editar" y "Eliminar"; los confirmados dicen "Dato del alta, confirmado por vos".
- `/admin/usuarios` exige `administrador_tecnico` (404 para el resto). El layout de `/admin` deja entrar con cualquiera de los dos roles de administración y muestra en la barra lateral solo las secciones del rol que se tiene; cada página de modelos ya exige el rol de catálogo.
- Formato argentino: `62.400 km`, `10/10/2026`, `$ 85.000`, `$ 85.000,50`, `1,2 MB`.
- Desvíos de los diseños (anotados en `docs/cambios-para-el-informe.md` si tocan el informe): 18 sin "Cuenta creada el…" (la búsqueda no devuelve fechas, RNF-06) y con "El cambio se aplica en la próxima pantalla que abra el usuario" (CU-18 paso 4 tal como quedó en 3C).
- Sin e2e nueva en este plan (es del 3E); la existente tiene que seguir pasando.

## Review Focus

1. Un archivo de más de 5 MB o un PDF → aviso inmediato debajo del campo, sin subir nada.
2. Envío con errores de validación → los valores escritos siguen en los campos; el archivo elegido sigue elegido.
3. Editar un trabajo con comprobante y "Quitar" → `quitarComprobante=1`; reemplazar → ruta nueva; ninguno de los dos → se mantiene.
4. `?cambios=` con basura o ids que no son del vehículo → se ignoran; al recargar la ficha el aviso no vuelve (igual que CU-08).
5. Un propietario o un administrador de catálogo sin rol técnico → `/admin/usuarios` da 404; el técnico sin rol de catálogo entra a `/admin` y llega a Usuarios.
6. El enlace firmado del comprobante no se cachea en una página estática (la página es dinámica por usar la sesión).

## Mapa de archivos

| Archivo | Qué hace |
|---|---|
| `src/dominio/vista-trabajo.ts` (nuevo) | `formatearCosto`, `costoParaCampo`, `fechaParaCampo`, `formatearTamano`, `detalleDelTrabajo`, `leerCambios`, `rutaFichaConCambios` |
| `src/dominio/vista-estado.ts` | `textoCambiosTrabajo` |
| `src/dominio/roles.ts` | `nombreDeRol` (sale de `cuenta/page.tsx`), `esAdministrador` |
| `src/datos/sesion.ts` | `exigirAdministracion()` (cualquiera de los dos roles; devuelve claims y roles) |
| `src/app/(propietario)/vehiculos/[id]/trabajos/acciones.ts` (nuevo) | `guardarTrabajo`, `borrarTrabajo` |
| `src/app/(propietario)/vehiculos/[id]/trabajos/formulario-trabajo.tsx` (nuevo) | Pantalla 15 (registrar y editar) |
| `src/app/(propietario)/vehiculos/[id]/registrar/page.tsx` (nuevo) | 15, registrar |
| `src/app/(propietario)/vehiculos/[id]/historial/page.tsx` (nuevo) | 16 |
| `src/app/(propietario)/vehiculos/[id]/historial/[trabajo]/page.tsx` (nuevo) | 17 |
| `src/app/(propietario)/vehiculos/[id]/historial/[trabajo]/eliminar.tsx` (nuevo) | 17, estado 2 (diálogo) |
| `src/app/(propietario)/vehiculos/[id]/historial/[trabajo]/editar/page.tsx` (nuevo) | 15, editar |
| `src/app/(propietario)/vehiculos/[id]/page.tsx`, `cambios.tsx` | Botones nuevos; aviso de cambios desde la URL |
| `src/app/admin/layout.tsx`, `src/app/admin/page.tsx` | Acceso por rol, enlace a Usuarios |
| `src/app/admin/usuarios/page.tsx`, `acciones.ts`, `buscador.tsx` (nuevos) | 18 |
| `src/app/(propietario)/cuenta/page.tsx` | "Cambiar a Administración" también para el técnico |

---

### Task 1: Formato y textos (dominio, primero la prueba)

**Files:** Create `src/dominio/vista-trabajo.ts`, `tests/unit/vista-trabajo.test.ts`; modify `src/dominio/vista-estado.ts`, `tests/unit/vista-estado.test.ts`, `src/dominio/roles.ts`, `tests/unit/roles.test.ts`.

**Interfaces (produce):**
- `formatearCosto(costo: string): string` — `"85000"` → `"$ 85.000"`, `"85000.5"` → `"$ 85.000,50"`, `"0"` → `"$ 0"`.
- `costoParaCampo(costo: string | null): string` — inverso para el campo: `"85000.50"` → `"85.000,50"`, `null` → `""` (lo vuelve a leer `leerCosto`).
- `fechaParaCampo(fecha: Date): string` — `aaaa-mm-dd` en UTC (lo que espera `<input type="date">`).
- `formatearTamano(bytes: number): string` — `< 1 MB` → `"850 KB"` (redondeo hacia arriba, mínimo 1); si no, `"1,2 MB"` (un decimal, coma).
- `detalleDelTrabajo(t: { km: number; taller: string | null }): string` — `"62.400 km · Lubricentro San Martín"` o `"60.900 km"`.
- `leerCambios(valor: unknown): number[]` — `"3,5"` → `[3, 5]`; ignora lo que no sea entero positivo, sin repetidos, a lo sumo 50; un arreglo (parámetro repetido) → `[]`.
- `rutaFichaConCambios(vehiculoId: string, cambios: { itemId: number }[]): string` — sin cambios → `/vehiculos/{id}`; con cambios → `/vehiculos/{id}?cambios=3,5`.
- `textoCambiosTrabajo(cambios)` en `vista-estado.ts` — `"Con el trabajo registrado cambió el estado de 1 ítem: Aceite y filtro de aceite, ahora al día."`; `null` si no hay cambios.
- `nombreDeRol(rol: string): string` y `esAdministrador(roles: string[]): boolean` en `roles.ts`.

- [ ] Step 1: pruebas que fallan, con los ejemplos de arriba y los bordes (costo con un decimal, 999 KB vs 1 MB justo, `leerCambios("0,-1,a,3,3")` → `[3]`).
- [ ] Step 2: `npm test` → fallan por falta de módulo/exports.
- [ ] Step 3: implementar.
- [ ] Step 4: `npm test` en verde; `npm run typecheck`; commit `feat: formato del trabajo y texto de cambios (CU-10, CU-13)`.

### Task 2: Acciones y formulario del trabajo (pantalla 15)

**Files:** Create `trabajos/acciones.ts`, `trabajos/formulario-trabajo.tsx`, `registrar/page.tsx`, `historial/[trabajo]/editar/page.tsx`.

**Acciones (`"use server"`):**
- `EstadoTrabajo = { errores?: ErroresCampo; valores?: Record<string, string> }`.
- `guardarTrabajo(vehiculoId, trabajoId: string | null, _previo, datos)`: `exigirClaims`; `entrada = Object.fromEntries(datos)` (solo strings); `trabajoId === null` → `registrarTrabajo(claims, await createClient(), vehiculoId, entrada)`, si no `editarTrabajo(...)`. Error → `{ errores, valores }` (sin `comprobante`: el archivo ya se borró y se vuelve a subir). OK → `revalidatePath` de la ficha, la lista y el historial; registrar redirige a `rutaFichaConCambios(vehiculoId, cambios)`, editar al detalle.
- `borrarTrabajo(vehiculoId, trabajoId)`: `eliminarTrabajo`; error → `{ errores }`; OK → revalidar y redirigir al historial.

**Formulario (cliente)**, props: `accion`, `usuarioId`, `items: { id: number; nombre: string }[]`, `catalogado: boolean`, `inicial?: { fecha; km; taller; costo; descripcion; tieneComprobante }` (edición), `textoBoton`.
- Registrar con catálogo: selector segmentado "Del plan" / "Otro trabajo" (dos botones con `aria-pressed`, fondo `muted`, el activo en blanco) y `<input type="hidden" name="tipo">`. "Del plan" → `Selector` "Trabajo" (`itemId`); "Otro trabajo" → `Campo` "Descripción". Sin catálogo: solo "Descripción" y `tipo=libre`. En edición no hay tipo: el título de la página es el nombre del trabajo.
- Campos: Fecha (`type="date"`, `max` = hoy), Kilometraje (`inputMode="numeric"`, sufijo km), Taller y Costo con "Opcional" a la derecha de la etiqueta (prop `opcional` nueva en `Campo`) y prefijo `$` (prop `prefijo` nueva).
- Comprobante: sin archivo → botón secundario a lo ancho con clip "Adjuntar comprobante" y ayuda "JPG o PNG, hasta 5 MB."; con archivo → tarjeta blanca con miniatura (`URL.createObjectURL`, liberada al cambiar), nombre · tamaño y enlace "Quitar". En edición con comprobante guardado y sin archivo nuevo → tarjeta "Comprobante guardado" con "Quitar" (pone `quitarComprobante=1`) y "Reemplazar". Error de archivo debajo, en rojo.
- Envío: la función de `useActionState` sube primero el archivo nuevo (`subirComprobante(createClient(), usuarioId, archivo)`), si falla devuelve el error en `comprobante` sin llamar al servidor; si sube, `datos.set("comprobante", ruta)` y llama a la acción. `formulario` arriba en un `Aviso` de error.
- Botón principal a lo ancho "Guardar trabajo" / "Guardar cambios", deshabilitado mientras envía.

**Páginas:** registrar (`exigirClaims`, `obtenerVehiculo`, `estadoDelVehiculo` para los ítems; 404 si no es suyo); editar (`intervencionDelVehiculo`; 404 si no existe o no es `editable`). Barra "← Volver" + título centrado como en el diseño (Volver va a la ficha o al detalle).

- [ ] Step 1: `Campo` con `opcional` y `prefijo`.
- [ ] Step 2: acciones.
- [ ] Step 3: formulario y páginas.
- [ ] Step 4: `npm run typecheck && npm run lint`; commit `feat: pantalla registrar y editar trabajo (CU-10, CU-11, CU-12)`.

### Task 3: Historial y detalle (pantallas 16 y 17)

**Files:** Create `historial/page.tsx`, `historial/[trabajo]/page.tsx`, `historial/[trabajo]/eliminar.tsx`.

- 16: subtítulo con el vehículo; lista en una tarjeta blanca con filas separadas por línea (`divide-y`), cada fila es un enlace al detalle: columna de fecha (`dd/mm` arriba, año abajo, cifras tabulares, línea a la derecha), nombre del trabajo (con clip si tiene comprobante, `aria-label="Con comprobante"`), costo a la derecha, `detalleDelTrabajo` debajo y "Dato del alta, confirmado por vos" en las confirmadas, chevron. Al pie, botón principal "Registrar trabajo". Vacío (2a): "Todavía no registraste trabajos para este vehículo." + "Cuando registres uno, el plan vuelve a contar desde ese día." + botón "Registrar el primero".
- 17: título = nombre del trabajo; tarjeta con Fecha, Kilometraje, Taller y Costo (los que tengan dato) separados por línea; "Comprobante" con la imagen del enlace firmado (`enlaceDelComprobante`) y "Ver en tamaño completo" (abre la imagen en otra pestaña); si el enlace falla, "No pudimos mostrar el comprobante." Si es `registrada`: "Editar" (secundario) y "Eliminar trabajo" (secundario con texto rojo) que abre el diálogo: "¿Eliminar este trabajo?", "Se borra del historial junto con su comprobante y el plan vuelve a contar desde el trabajo anterior. No se puede deshacer.", "Cancelar" con borde + "Eliminar trabajo" peligroso. Confirmados: "Dato del alta, confirmado por vos. Si estaba mal, registrá el trabajo real."
- [ ] Step 1: páginas. [ ] Step 2: typecheck y lint; commit `feat: historial y detalle del trabajo (CU-12, CU-13)`.

### Task 4: Ficha: accesos y aviso de cambios

**Files:** Modify `vehiculos/[id]/page.tsx`, `vehiculos/[id]/cambios.tsx`, `vehiculos/[id]/kilometraje.tsx`.

- `ProveedorCambios` recibe `inicial?: { texto: string; itemIds: number[] }`; el estado pasa a ser `{ texto, itemIds } | null` (la lectura de km arma su texto con `textoCambios`). Si hay `inicial`, al montar se limpia `?cambios` de la URL con `history.replaceState` (al recargar no vuelve, como CU-08).
- La ficha lee `searchParams.cambios` con `leerCambios`, toma de `estado.items` los que coinciden (los demás se ignoran) y arma `textoCambiosTrabajo`.
- Debajo de la lista: "Registrar trabajo" (principal, a lo ancho) y "Historial" (secundario); "Editar datos" y "Eliminar vehículo" siguen igual. Sin catálogo, el aviso ya dice que puede registrar trabajos.
- [ ] Step 1: cambios. [ ] Step 2: typecheck, lint, unitarias; commit `feat: la ficha registra trabajos, abre el historial y avisa los cambios (CU-10 paso 7)`.

### Task 5: Administración de usuarios (pantalla 18)

**Files:** Modify `src/datos/sesion.ts`, `src/app/admin/layout.tsx`, `src/app/admin/page.tsx`, `src/app/(propietario)/cuenta/page.tsx`; create `src/app/admin/usuarios/{page.tsx,acciones.ts,buscador.tsx}`.

- `exigirAdministracion()`: claims + roles; 404 si no tiene ninguno de los dos roles de administración.
- Layout: barra lateral con "Modelos" si tiene catálogo y "Usuarios" si es técnico; la sección activa con la línea oro (`usePathname` en un componente cliente chico `nav-admin.tsx`). `/admin` redirige a modelos o, si no tiene catálogo, a usuarios. La cuenta muestra "Cambiar a Administración" con cualquiera de los dos roles.
- Acciones (`exigirRol("administrador_tecnico")`): `buscar(_previo, datos)` → `buscarCuenta`; `cambiar(_previo, datos)` → `cambiarRolCatalogo` y devuelve la cuenta con los roles nuevos y un mensaje "Listo: ahora es administrador de catálogo." / "Listo: ya no es administrador de catálogo.". Estado: `{ errores?, cuenta?, mensaje?, email? }`.
- Página: "Usuarios", bajada "Buscá una cuenta por su correo exacto para darle o sacarle el rol de administrador de catálogo."; campo "Correo electrónico" + "Buscar" (principal) en una fila; error debajo ("No hay ninguna cuenta con ese correo."). Resultado en tarjeta: correo como título, "Roles" con chips grises (`nombreDeRol`), y un botón secundario que toma el ancho del texto: "Dar administrador de catálogo" (tinta) o "Quitar administrador de catálogo" (texto rojo), con la ayuda "El cambio se aplica en la próxima pantalla que abra el usuario." y el mensaje de éxito como `Aviso` tipo éxito.
- [ ] Step 1: sesión, layout y cuenta. [ ] Step 2: página y acciones. [ ] Step 3: typecheck, lint, unitarias; commit `feat: administración de usuarios (CU-18, RF-21)`.

### Task 6: Verificación y cierre

- [ ] `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`.
- [ ] Integración local si la red lo permite (si no, la corre el CI).
- [ ] Recorrido en el navegador integrado con una cuenta temporal (enlace `generateLink`, se borra al final): registrar el aceite del Ka con un PNG chico → ficha con aviso y "Al día"; historial con el clip; detalle con la imagen; editar y quitar el comprobante; eliminar; archivo de 6 MB → aviso. Pantalla 18 con una cuenta técnica temporal: buscar, dar y quitar el rol. Celular (375 px) y escritorio.
- [ ] `docs/cambios-para-el-informe.md`: desvíos de la pantalla 18.
- [ ] Revisión final (un subagente), PR con los tres checks, merge.
