# Iteración 1 — Base: especificación de diseño

**Proyecto:** Plataforma Web de Mantenimiento Programado Vehicular (SPAS, Universidad Siglo 21)
**Iteración:** 1 de 3 de la fase de construcción (Tabla 8 del informe)
**Período planificado:** 29/09 al 12/10/2026 (inicio real: 05/10/2026)
**Alcance:** RF-01 a RF-07 y RF-18 a RF-20
**Resultado verificable (Tabla 8):** un usuario crea su cuenta y registra un vehículo de un modelo catalogado.

## 1. Fuentes y regla de coherencia

El *qué* ya está especificado en el informe (`felipe_massone_spas_informe.docx`, generado por `build_informe.py`):

| Fuente en el informe | Qué define |
|---|---|
| Tabla 5 (6.2.1) | Requerimientos funcionales RF-01 a RF-21 |
| Tabla 6 (6.2.2) | Requerimientos no funcionales RNF-01 a RNF-13 |
| Figura 6 y Tablas 9 a 26 (7.1.1 y 7.1.3) | Casos de uso CU-01 a CU-18 con sus flujos |
| Figura 7 y 7.1.2 | Modelo de datos: 12 entidades, 3FN, restricciones |
| 6.1.2 y Figura 5 | Arquitectura en capas y stack |

Este documento define el *cómo*. **Regla:** si el código necesita apartarse del informe, se corrige uno de los dos y se deja constancia; nunca quedan diciendo cosas distintas.

## 2. Stack y versiones

Última versión estable de cada herramienta (verificado con `npm view` el 05/10/2026). No se usan versiones preliminares.

| Herramienta | Versión | Uso |
|---|---|---|
| Next.js | 16.x | Framework de presentación y servidor (App Router, Server Actions, `proxy.ts`) |
| React | 19.x | Interfaz |
| TypeScript | modo estricto | RNF-11 |
| Tailwind CSS + shadcn/ui | 4.x | Estilos y componentes accesibles |
| Prisma (`prisma` y `@prisma/client`) | 7.10.x, misma versión fijada en ambos | ORM tipado y migraciones |
| Supabase | `@supabase/supabase-js` 2.x, `@supabase/ssr` 0.x | PostgreSQL, Auth y Storage |
| Zod | 4.x | Validaciones compartidas entre cliente y servidor |
| Vitest | 5.x | Pruebas unitarias y de integración, con cobertura |
| Playwright | estable | Prueba de punta a punta |

**Infraestructura:**
- Un proyecto de Supabase de desarrollo en la región São Paulo; el de producción se agrega al desplegar (el plan gratuito admite dos).
- Vercel para el despliegue; la cuenta la crea Felipe al cierre de la iteración.
- Repositorio público `felipemassone/mantenimiento-vehicular`.

## 3. Estructura del proyecto

```
app/
├─ prisma/
│  ├─ schema.prisma        traducción directa de la Figura 7
│  ├─ migrations/          incluye SQL propio: restricciones de verificación, RLS y trigger
│  └─ seed.ts              roles, Ford Ka 2014, roles de administrador de Felipe
├─ src/
│  ├─ app/                 CAPA DE PRESENTACIÓN
│  │  ├─ (auth)/           registro, ingreso, recuperación, confirmación
│  │  ├─ vehiculos/        panel del propietario
│  │  ├─ cuenta/           cerrar sesión, eliminar cuenta
│  │  └─ admin/            panel del administrador de catálogo
│  ├─ dominio/             CAPA DE APLICACIÓN (sin dependencias de Prisma ni de Next)
│  ├─ datos/               CAPA DE ACCESO A DATOS (único punto de acceso a la base)
│  │  └─ privilegiado.ts   única excepción con permisos de administrador (ver 4.4)
│  └─ lib/supabase/        clientes de Supabase para servidor y navegador
├─ tests/
│  ├─ unit/
│  ├─ integracion/
│  └─ e2e/
└─ proxy.ts                renovación de la sesión y redirecciones
```

**Reglas de dependencia:**
1. `dominio/` no importa Prisma, Next ni Supabase. Recibe datos y devuelve resultados.
2. Las páginas y las acciones no importan Prisma: llaman a funciones de `datos/`.
3. `datos/privilegiado.ts` solo lo importan el seed, la acción de eliminar cuenta y las pruebas. Se verifica con una regla de ESLint (`no-restricted-imports`).
4. Las mutaciones se exponen como Server Actions. *Pendiente para el informe del Módulo 4:* el apartado 6.1.2 dice "rutas de API"; ajustar la redacción a "acciones de servidor y rutas de API".

## 4. Base de datos y seguridad

### 4.1 Esquema

La primera migración crea las 12 entidades de la Figura 7, con sus nombres, tipos y claves:
- `USUARIO`, `ROL`, `USUARIO_ROL`
- `VEHICULO`, `LECTURA_KILOMETRAJE`
- `MARCA`, `MODELO`, `PLAN_MANTENIMIENTO`, `ITEM_MANTENIMIENTO`, `INTERVALO_PLAN`
- `INTERVENCION`, `COMPROBANTE`

Las dos últimas se crean aunque recién se usen en la Iteración 3.

Tipos enumerados:
- `estado_plan`: `borrador`, `publicado`, `reemplazado`
- `tipo_item`: `reemplazo`, `inspeccion`
- `origen_intervencion`: `registrada`, `supuesta_pendiente`, `supuesta_confirmada`, `supuesta_a_verificar`

### 4.2 Restricciones en SQL propio

Prisma no expresa estas restricciones; van en el SQL de la migración (apartado 7.1.2):
- Intervalos (`intervalo_km`, `intervalo_meses`) mayores que cero; kilometrajes (`LECTURA_KILOMETRAJE`, `INTERVENCION`) no negativos.
- `INTERVENCION`: exactamente uno entre `item_id` y `descripcion_libre`.
- `COMPROBANTE.tamano_bytes` ≤ 5 MB (5 × 1024 × 1024).
- Un único plan `publicado` por modelo: índice único parcial sobre `modelo_id` cuando `estado = 'publicado'`.
- `MODELO`: `anio_desde` ≤ `anio_hasta` cuando `anio_hasta` no es nulo.
- `VEHICULO`: `modelo_id` o el par `marca_libre` y `modelo_libre`, nunca ambos ni ninguno.
- Las claves foráneas que dependen del usuario eliminan en cascada (RF-04).
- `USUARIO.id` referencia a `auth.users(id)` con eliminación en cascada.

En la capa de aplicación, como dice el apartado 7.1.2, quedan dos reglas:
- **El kilometraje no disminuye (RF-07).** Se valida dentro de la misma transacción que inserta la lectura y se bloquea la fila del vehículo (`SELECT … FOR UPDATE`) para que dos cargas simultáneas no salteen la regla.
- **Los intervalos de un plan corresponden a ítems de su mismo modelo.**

### 4.3 Alta automática del usuario

Un trigger sobre `auth.users`, al insertar, crea la fila en `USUARIO` con el mismo `id`, el correo y la fecha. También le asigna el rol `propietario` en `USUARIO_ROL`. Supabase no permite iniciar sesión hasta que el correo esté confirmado (RF-01), así que la cuenta no se puede usar antes de la confirmación.

### 4.4 Seguridad a nivel de fila (RNF-04) con Prisma: opción C

Todas las tablas del esquema público tienen RLS activado. Políticas:

| Datos | Lectura | Escritura |
|---|---|---|
| `VEHICULO`, `LECTURA_KILOMETRAJE`, `INTERVENCION`, `COMPROBANTE` | Dueño (`usuario_id = auth.uid()`, o a través de su vehículo) | Dueño |
| `MARCA`, `MODELO` | Cualquier usuario autenticado | Administrador de catálogo |
| `PLAN_MANTENIMIENTO`, `INTERVALO_PLAN` | Autenticados: solo planes `publicado` y sus intervalos. Administrador de catálogo: todo | Administrador de catálogo |
| `ITEM_MANTENIMIENTO` | Cualquier usuario autenticado: el historial puede referenciar ítems de un plan reemplazado (*ajuste del plan 1A*) | Administrador de catálogo |
| `USUARIO`, `USUARIO_ROL` | La propia cuenta | Nadie en esta iteración; RF-21 llega en la Iteración 3 |
| `ROL` | Autenticados | Nadie |

El rol se consulta con una función `SECURITY DEFINER` `tiene_rol(nombre)`, para que las políticas no se llamen a sí mismas en recursión.

**Ejecución "en nombre del usuario".** La función `conUsuario(claims, fn)` (`datos/cliente-usuario.ts`) abre una transacción interactiva de Prisma que:
1. ejecuta `SELECT set_config('request.jwt.claims', <claims JSON>, true)`;
2. ejecuta `SET LOCAL ROLE authenticated`;
3. ejecuta `fn`, que puede hacer varias consultas: todas quedan en la misma transacción, con RLS aplicado.

Se prefirió a una extensión que envuelve cada consulta suelta porque las operaciones de varios pasos (bloquear el vehículo, validar y guardar la lectura) tienen que ser atómicas (apartado 4.2). *Ajuste del plan 1A.*

Los *claims* salen **siempre** del token verificado en el servidor (`supabase.auth.getClaims()`, con las claves de firma asimétricas del proyecto). Nunca salen de datos enviados por el navegador.

**Conexiones:**
- En ejecución, el pooler de Supabase en modo transacción; `SET LOCAL` y `set_config(..., true)` duran exactamente la transacción.
- Para las migraciones y el seed, el pooler en modo sesión. La conexión directa de Supabase solo funciona por IPv6.

**Excepción privilegiada (`datos/privilegiado.ts`):** conexión sin RLS y clave secreta de Supabase. Se usa solo para:
- el seed;
- la asignación inicial de roles a Felipe;
- la eliminación del registro de autenticación en RF-04.

## 5. Autenticación

- `@supabase/ssr` con sesión en cookies `HttpOnly`.
- `proxy.ts` renueva la sesión y redirige a quien no la tiene. **No es la barrera de seguridad** (CVE-2025-29927): cada operación de `datos/` vuelve a verificar el token.
- Las páginas de administración verifican el rol en el servidor, además de las políticas de RLS.

Configuración de Supabase Auth:

| Requerimiento | Configuración |
|---|---|
| RNF-05: token de acceso de 60 minutos | Expiración del JWT: 3600 s |
| RNF-05: token de actualización de un solo uso | Rotación de tokens de actualización activada |
| RF-02: cerrar sesión revoca el token | `signOut()` |
| RF-01: confirmación del correo | "Confirm email" activado |
| RF-01: mínimo de 8 caracteres | Largo mínimo de contraseña: 8, también validado en el formulario |
| CU-03: no revelar si la cuenta existe | Comportamiento por defecto de `resetPasswordForEmail` |

Flujos:
- **CU-01 Registro:** el enlace de confirmación lleva a `/auth/confirmar`, que activa la cuenta e inicia la sesión. Plantillas de correo propias en español.
- **CU-02 Ingreso:** si la cuenta no está confirmada (excepción 2b), se ofrece reenviar el enlace. Si la cuenta tiene más de un rol, la barra superior alterna entre "Mis vehículos" y "Administración".
- **CU-03 Recuperación:** el enlace de un solo uso lleva a `/auth/confirmar` y de ahí a la pantalla de contraseña nueva.
- **CU-04 Eliminar cuenta:** se reverifica la contraseña antes de eliminar, y la eliminación del registro de autenticación arrastra todo lo demás en cascada. La limpieza de Storage se agrega en la Iteración 3.

Enlaces del correo (*ajuste del plan 1B*): sin SMTP propio, Supabase no permite editar las plantillas. Con las plantillas por defecto el enlace vuelve con un código PKCE (`?code=`), que solo se puede canjear en el mismo navegador donde se pidió; con SMTP propio se usan plantillas en español con `token_hash`, que funcionan en cualquier dispositivo. `/auth/confirmar` acepta los dos formatos, así que pasar de uno a otro no requiere cambios de código.

Correo:
- Durante el desarrollo, el servidor de Supabase que viene por defecto (solo envía a las direcciones del equipo del proyecto).
- Al desplegar, SMTP propio con **Resend**, desde un subdominio del dominio de Felipe. Es condición de cierre de la iteración.

Para la tesis final quedan el CAPTCHA, la verificación en dos pasos y el bloqueo de contraseñas filtradas.

## 6. Pantallas y funciones

**Propietario:**

| Pantalla | Casos de uso | Comportamiento |
|---|---|---|
| Mis vehículos | — | Tarjetas con marca, modelo, año y último kilometraje. Con un solo vehículo, abre su ficha directamente |
| Agregar vehículo | CU-05 | Marca, luego modelo y luego año, solo entre modelos con plan publicado; el año se valida contra el rango del modelo; kilometraje no negativo, guardado como primera lectura. "Mi modelo no figura" (3a) pide marca y modelo a mano y avisa que no se calculará su mantenimiento |
| Ficha del vehículo | CU-07, CU-08 | Datos, última lectura y su fecha, y las acciones "Actualizar kilometraje", "Editar" y "Eliminar". Una lectura menor se rechaza indicando el mínimo admitido. Reserva el espacio del estado de mantenimiento, que llega en la Iteración 2 |
| Mi cuenta | CU-02, CU-04 | Cerrar sesión; eliminar la cuenta, con advertencia y contraseña |

**Límite de la iteración:** los pasos que incluyen CU-14 (CU-05 paso 6, CU-07 paso 5, CU-08 paso 6) se implementan en la Iteración 2. En esta iteración, esos flujos terminan en el paso anterior.

**Administrador de catálogo:**
- **CU-15 Modelos:** lista y alta. La marca se elige o se crea; nombre y rango de años. Se rechaza un modelo con la misma marca, el mismo nombre y años superpuestos. Al crearlo, se crea su plan versión 1 en `borrador`.
- **CU-16 Plan:** ítems con nombre, tipo ("cambiar" = `reemplazo`, "revisar" = `inspeccion`), kilómetros y meses opcionales. Editar un plan `publicado` crea la versión siguiente en `borrador`, copiando sus intervalos; la versión publicada sigue vigente.
- **CU-17 Publicar:** valida RF-20 (sin intervalos nulos o negativos, sin ítems duplicados, al menos un ítem). En una sola transacción, la versión anterior pasa a `reemplazado` y la nueva a `publicado`.

**Transversal:**
- Esquemas Zod en `dominio/`, usados por el formulario y por la acción del servidor.
- Mensajes de error tomados de las excepciones de cada ficha.
- Diseño primero para celular, con 360 px de ancho mínimo (RNF-10).
- Interfaz en español rioplatense.

## 7. Datos iniciales (seed)

- Roles: los tres se insertan en la migración inicial, porque el trigger de alta los necesita (*ajuste del plan 1A*).
- Marca Ford y modelo Ka, años 2014–2014 (lo que respalda el manual; ampliar solo con verificación), con su plan versión 1 `publicado`, transcripto de la tabla "Programa de mantenimiento Ford - KA" de `KaGarantia2014-02.pdf` (págs. impresas 22–27). Cada ítem lleva su tipo (reemplazo o inspección), sus kilómetros y, solo si el manual los publica, sus meses. **Ante contradicciones del manual** (por ejemplo, el refrigerante: 3 años o 90.000 km en la tabla de líquidos, 10 años o 105.000 km en el programa) **se usa el intervalo más conservador**, y queda un comentario en el seed con ambas fuentes.
- Roles `administrador_catalogo` y `administrador_tecnico` asignados al correo de Felipe, tomado de una variable de entorno y nunca escrito en el código.

El seed es idempotente: se puede ejecutar varias veces sin duplicar datos.

## 8. Pruebas

| Nivel | Herramienta | Cobertura mínima |
|---|---|---|
| Unitarias | Vitest | Esquemas Zod; regla del kilometraje no decreciente; año dentro del rango del modelo; validaciones de publicación (RF-20); superposición de rangos de años |
| Integración | Vitest contra Supabase de desarrollo | RLS: A no lee ni modifica vehículos o lecturas de B; un propietario no ve borradores ni escribe el catálogo; el administrador sí. Restricciones: rechazo de negativos y de un segundo plan publicado. Trigger: el registro crea `USUARIO` con rol `propietario`. Publicación: queda exactamente un plan publicado |
| Punta a punta | Playwright | Registro → confirmación (el enlace se obtiene con la API de administración en el entorno de pruebas) → ingreso → alta de un Ford Ka → actualización del kilometraje → rechazo de una lectura menor |

Las pruebas de integración crean sus propios usuarios y datos, y los eliminan al terminar.

## 9. Integración continua y forma de trabajo

- GitHub Actions en cada push y en cada pull request: `tsc --noEmit` (RNF-11), ESLint y pruebas unitarias. Las pruebas de integración corren con secretos del repositorio.
- RNF-13 (desplegar solo si compila y pasan las pruebas) se configura junto con Vercel.
- Una rama por funcionalidad y un pull request a `main`, con la integración continua en verde.
- Commits con prefijos convencionales (`feat:`, `fix:`, `test:`, `docs:`).
- Las claves van solo en `.env.local` (ignorado por git). En el repositorio queda `.env.example` sin valores. Antes de cada commit se revisa que no haya claves.

## 10. Secuencia

1. Esta especificación.
2. **Diseño de interfaz:** sistema visual y pantallas de la sección 6. Se reusa en el apartado 7.1.5 del Módulo 4.
3. Plan de implementación.
4. Implementación.

## 11. Criterio de terminado

1. Pasan las pruebas unitarias, de integración y de punta a punta.
2. El recorrido de punta a punta funciona en Vercel, con correos reales enviados por Resend.
3. `tsc` sin errores en modo estricto.
4. El esquema desplegado coincide con la Figura 7, entidad por entidad.
5. Lo que haya cambiado respecto del informe queda anotado para el Módulo 4.

## 12. Fuera del alcance de esta iteración

- **Iteración 2:** CU-14, la vista del estado (CU-09), la confirmación de supuestos (CU-06) y el estado de mantenimiento.
- **Iteración 3:** intervenciones (CU-10 a CU-13), Storage, la asignación de roles (CU-18) y la limpieza de Storage al eliminar la cuenta.
- **Tesis final:** CAPTCHA, verificación en dos pasos, bloqueo de contraseñas filtradas, carga del catálogo de otros modelos más allá de los que se consigan para la demo.
