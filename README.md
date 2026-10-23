# Km 12

Plataforma web de mantenimiento programado vehicular. Proyecto del Seminario de Práctica de
Analista en Software (Universidad Siglo 21).

Producción: https://mantenimiento-vehicular-ten.vercel.app

## Stack

Next.js 16 (App Router, Server Actions) · React 19 · TypeScript estricto · Tailwind 4 y
shadcn/ui · Prisma 7 · Supabase (PostgreSQL y Auth) · Zod 4 · Vitest · Playwright ·
GitHub Actions · Vercel · Resend.

## Arquitectura

- `src/app`: presentación (páginas y Server Actions). No importa Prisma.
- `src/dominio`: reglas sin dependencias de frameworks.
- `src/datos`: único acceso a la base. Toda operación pasa por `conUsuario(claims, fn)`, que
  abre una transacción con el rol `authenticated` y los claims del usuario, así que la
  seguridad a nivel de fila de PostgreSQL se aplica siempre (RNF-04). `privilegiado.ts` es la
  única excepción (seed, eliminar cuenta y pruebas).
- ESLint hace cumplir estas reglas.

## Correr en local

1. `npm install`
2. Copiar `.env.example` a `.env.local` y completarlo con el proyecto de Supabase de
   desarrollo (las dos URL del pooler: la directa es solo IPv6).
3. `npx prisma migrate deploy` y `npx prisma db seed`
4. `npm run dev` → http://localhost:3000

## Pruebas

| Comando | Qué corre |
|---|---|
| `npm test` | Unitarias (dominio) |
| `npm run test:integracion` | Integración contra Supabase de desarrollo: RLS, restricciones, trigger, publicación del plan y comprobantes en Storage |
| `npm run test:e2e` | Punta a punta con Playwright: el recorrido del propietario en un celular emulado (Chromium) y en Firefox, WebKit y Edge (RNF-09); en cada pantalla comprueba que con 360 px de ancho no haya desplazamiento horizontal (RNF-10) |

En el CI, el job `integracion` aplica primero las migraciones de la rama a la base de desarrollo
(`prisma migrate deploy`); en local hay que correrlo a mano después de cada migración nueva.
Para un solo navegador: `npx playwright test --project=firefox` (los nombres están en
`playwright.config.ts`; `edge` usa el Edge instalado en la máquina).

### Prueba de carga (RNF-02, PS-07)

50 usuarios virtuales de [k6](https://k6.io) consultan cada uno la ficha de su vehículo, una
vez por segundo durante 5 minutos. Criterio: promedio menor a 500 ms y 0 % de errores. **Nunca
contra producción**: las cuentas se crean en la base de desarrollo, la misma que usan las vistas
previas.

En GitHub: Actions → **Carga** → Run workflow. El job despliega su propia vista previa, prepara
las cuentas, corre k6, deja el resumen en la página de la corrida y borra las cuentas. Comparte
el grupo `base-dev` con integración y punta a punta, así que espera a que terminen. Necesita el
secreto `VERCEL_AUTOMATION_BYPASS_SECRET` (Vercel → Settings → Deployment Protection →
Protection Bypass for Automation), porque las vistas previas piden ingresar.

En local, con k6 instalado y la URL de una vista previa:

```bash
npx tsx tests/carga/preparar.ts
k6 run -e BASE_URL=https://<vista-previa>.vercel.app -e VERCEL_AUTOMATION_BYPASS_SECRET=<secreto> tests/carga/ficha.js
npx tsx tests/carga/limpiar.ts
```

El criterio de RNF-02 se mide en el servidor, como RNF-01: cada ficha deja en los logs de Vercel
`[RNF-02] ficha pedido=N ms datos=M ms` (desde que el pedido llega al proxy hasta que termina la
respuesta), y `tests/carga/servidor.ts`, lanzado antes de k6 con `BASE_URL`, `DURACION` y
`VERCEL_TOKEN`, `VERCEL_ORG_ID` y `VERCEL_PROJECT_ID`, los lee en vivo y deja el resumen en
`tests/carga/servidor.md`. El workflow lo hace solo. El promedio de k6 queda como dato
complementario: incluye la red entre el generador de carga y `gru1`.

k6 pide la página comprimida, como un navegador; `-e COMPRESION=no` (o la opción "compresion" del
workflow) la pide sin comprimir, como las dos primeras corridas del 17/10/2026.
`preparar.ts` deja las cookies de sesión en `tests/carga/sesiones.json` (no se versiona);
`limpiar.ts` borra todas las cuentas `carga-k6-…`, también las de una corrida que se cortó.

## Comprobantes (RF-15)

- Bucket privado `comprobantes` de Supabase Storage, creado por la migración `0004_registro`
  junto con sus políticas: 5 MB, JPG y PNG, y cada usuario sube, lee y borra solo en la carpeta
  con su id. Producción lo recibe con el build del próximo despliegue.
- El navegador sube la imagen con la sesión del usuario al enviar el formulario
  (`src/lib/comprobantes.ts`) y manda solo la ruta; el servidor la verifica en `storage.objects`
  dentro de la transacción del trabajo (`src/datos/intervenciones.ts`). Los archivos se borran
  por la API de Storage (`src/datos/comprobantes.ts`): la base no deja borrarlos con SQL.
- Las imágenes se ven con enlaces firmados de 60 segundos. Eliminar la cuenta vacía antes la
  carpeta del usuario.

La prueba de punta a punta crea una cuenta con una dirección de prueba de Resend
(`delivered+…@resend.dev`) y la elimina al final.

## Despliegue (RNF-13)

- `main` solo acepta cambios por pull request con `verificar` (tipos, lint y unitarias),
  `integracion` y `e2e` en verde y con la rama al día, también para administradores.
- Cada cambio en `main` lo despliega a producción el job `desplegar` del CI, **solo** después de
  los tres checks, con la CLI de Vercel (`vercel deploy --prod`). En `main` no se repiten
  integración y punta a punta (no compiten por la base de desarrollo con los PR): el job
  `comprobar-pr` exige que el commit sea el merge de un PR, con los mismos archivos que su último
  commit y los tres checks en verde ahí; `verificar` sí corre sobre el merge. Vercel compila con sus variables
  de Production: el build aplica las migraciones pendientes (`prisma migrate deploy`) y, si no
  compila, no se despliega (RNF-11). El despliegue automático propio de Vercel está apagado en
  `vercel.json` (`git.deploymentEnabled`), porque su conexión con GitHub fallaba con un 403.
- Cada PR tiene su vista previa (job `vista-previa`, enlace en el resumen del CI), contra el
  proyecto de Supabase de desarrollo.
- Secretos y variables del repositorio: `VERCEL_TOKEN` (secreto), `VERCEL_ORG_ID` y
  `VERCEL_PROJECT_ID` (variables).
- Limitación de las vistas previas: comparten el proyecto de Supabase de desarrollo, cuya lista
  de Redirect URLs solo tiene `http://localhost:3000/**`. Ingresar funciona; crear una cuenta o
  recuperar la contraseña desde una vista previa no (el enlace del correo cae en localhost). No se
  usan comodines de `*.vercel.app`: cualquiera puede crear un proyecto con ese nombre y recibir
  los enlaces. Nota para la tesis final: una base efímera por PR (Supabase branching).
- Funciones en São Paulo (`gru1`), junto a la base.
- Correo propio con Resend desde un subdominio verificado (SPF, DKIM y DMARC).

Para correr la CLI de Prisma o el seed contra producción, con un `.env.produccion.local`:

```bash
ARCHIVO_ENTORNO=.env.produccion.local npx prisma db seed
```

## Latido contra la pausa por inactividad

- El plan gratuito de Supabase pausa un proyecto que muestra poca actividad de base durante 7
  días; según su documentación, alcanza con algunas consultas por día. Producción tiene poco
  tráfico, y desarrollo solo recibe el del CI.
- El workflow `Latido` (`.github/workflows/latido.yml`) corre todos los días a las 09:17 y 21:17
  UTC y a mano (Actions → Latido → Run workflow). Actualiza la única fila de `operacion.latido`
  (migración `0006_latido`) en producción y en desarrollo. No toca datos de usuarios ni tablas
  del negocio; el esquema `operacion` queda fuera del modelo de Prisma, de la API de Supabase y
  del respaldo.
- El job `produccion` corre en el entorno `produccion` (secreto `PROD_DIRECT_URL`); el job
  `desarrollo` usa el secreto `DIRECT_URL` del repositorio.
- Si la base no responde o la fila no existe, la corrida falla y GitHub la avisa por correo a quien modificó el
  `cron` por última vez.
  Un proyecto ya pausado se restaura desde el panel de Supabase.
- Los programados dependen de que el repositorio tenga actividad: GitHub los apaga después de 60
  días sin commits (ver Respaldo).

## Respaldo y restauración (RNF-08)

- El workflow `Respaldo` (`.github/workflows/respaldo.yml`) corre los domingos a las 06:00 UTC y
  a mano (Actions → Respaldo → Run workflow). Vuelca los esquemas `public` y `auth` de producción
  con `pg_dump` 17 en formato custom, lo cifra con `gpg` (AES256) y verifica que se pueda
  descifrar y leer con `pg_restore --list` antes de subirlo.
- Cada corrida deja un artefacto `respaldo-AAAA-MM-DD` (Actions → Respaldo → la corrida →
  Artifacts; se descarga como `.zip`) que se conserva 28 días: cuatro copias semanales. El
  repositorio es público, por eso los archivos van cifrados. El volcado incluye los permisos de
  `public` (la app depende de los GRANT al rol `authenticated`), sin dueños.
- Corre en el entorno `produccion`, limitado a la rama `main`, con los secretos
  `PROD_DIRECT_URL` (pooler en modo sesión) y `RESPALDO_FRASE` (la frase de cifrado; está solo en
  GitHub y en el gestor de contraseñas del responsable: sin ella el respaldo no se puede abrir).
- GitHub apaga los workflows programados de un repositorio público después de 60 días sin
  actividad; si pasa, se reactiva desde la pestaña Actions.

Restauración, siempre en un proyecto de Supabase **nuevo**, nunca sobre producción. Hace falta
`pg_restore` 17 o posterior y GnuPG 2.4 o posterior (Gpg4win 4 en Windows). **Procedimiento todavía
no ensayado** contra un proyecto real; el orden responde a cómo se relacionan los esquemas:
`public.usuario` apunta a `auth.users`, y el trigger `al_crear_usuario` (sobre `auth.users`) crea
la fila de `public.usuario` de cada cuenta nueva.

```bash
# 1. Descifrar (con --output: en PowerShell, redirigir con > corrompe el binario).
gpg --output respaldo.dump --decrypt respaldo-AAAA-MM-DD.dump.gpg
pg_restore --list respaldo.dump

# 2. Las cuentas: solo los datos de auth, porque el esquema ya lo crea Supabase. Va primero
#    porque public.usuario las referencia, y todavía no existe el trigger que duplicaría filas.
pg_restore --no-owner --data-only --schema=auth --table=users --table=identities --dbname "$DESTINO" respaldo.dump

# 3. Todo public: tablas, datos, funciones, triggers, políticas RLS y permisos. pg_restore carga
#    los datos antes de crear triggers y claves foráneas. Un error esperable: "schema public
#    already exists".
pg_restore --no-owner --schema=public --dbname "$DESTINO" respaldo.dump

# 4. El trigger sobre auth.users no viaja con public: se vuelve a crear.
psql "$DESTINO" -c "CREATE TRIGGER al_crear_usuario AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.crear_usuario();"
```

`$DESTINO` es la cadena de conexión directa del proyecto nuevo. Después se cargan sus claves en
Vercel, se configuran Auth (SMTP, plantillas y Redirect URLs) como en producción y se vuelve a
desplegar. Si la versión de Supabase Auth del proyecto nuevo cambió columnas de `auth.users`, el
paso 2 puede fallar y hay que adaptar esos datos a mano.
