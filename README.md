# Libreta de service

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
| `npm run test:integracion` | Integración contra Supabase de desarrollo: RLS, restricciones, trigger y publicación del plan |
| `npm run test:e2e` | Punta a punta con Playwright, en un celular emulado |

La prueba de punta a punta crea una cuenta con una dirección de prueba de Resend
(`delivered+…@resend.dev`) y la elimina al final.

## Despliegue (RNF-13)

- `main` solo acepta cambios por pull request con `verificar` (tipos, lint y unitarias),
  `integracion` y `e2e` en verde y con la rama al día, también para administradores.
- Cada cambio en `main` lo despliega a producción el job `desplegar` del CI, **solo** después de
  los tres checks, con la CLI de Vercel (`vercel deploy --prod`). Vercel compila con sus variables
  de Production: el build aplica las migraciones pendientes (`prisma migrate deploy`) y, si no
  compila, no se despliega (RNF-11). El despliegue automático propio de Vercel está apagado en
  `vercel.json` (`git.deploymentEnabled`), porque su conexión con GitHub fallaba con un 403.
- Cada PR tiene su vista previa (job `vista-previa`, enlace en el resumen del CI), contra el
  proyecto de Supabase de desarrollo.
- Secretos y variables del repositorio: `VERCEL_TOKEN` (secreto), `VERCEL_ORG_ID` y
  `VERCEL_PROJECT_ID` (variables).
- Funciones en São Paulo (`gru1`), junto a la base.
- Correo propio con Resend desde un subdominio verificado (SPF, DKIM y DMARC).

Para correr la CLI de Prisma o el seed contra producción, con un `.env.produccion.local`:

```bash
ARCHIVO_ENTORNO=.env.produccion.local npx prisma db seed
```
