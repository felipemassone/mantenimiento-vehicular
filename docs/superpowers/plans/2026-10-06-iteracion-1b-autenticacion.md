# Iteración 1B — Autenticación y estructura visual: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que un propietario pueda crear su cuenta confirmando el correo, ingresar, recuperar la contraseña, cerrar sesión y eliminar su cuenta (CU-01 a CU-04, RF-01 a RF-04, RNF-05), en una aplicación que ya se ve con el sistema visual del DESIGN.md.

**Architecture:** Supabase Auth con `@supabase/ssr` (sesión en cookies). `proxy.ts` solo renueva la sesión y redirige; la barrera real es `exigirClaims()` en `src/datos/sesion.ts`, que cada página protegida y cada acción vuelve a ejecutar. Los formularios son componentes de cliente con `useActionState` que llaman a Server Actions; las validaciones viven en `src/dominio/cuenta.ts` (Zod) y las usan ambos lados. La interfaz usa shadcn/ui (base Radix) con los colores, la tipografía y los radios del DESIGN.md.

**Tech Stack:** Next.js 16 (App Router, Server Actions, `proxy.ts`), React 19 (`useActionState`), `@supabase/ssr` 0.x, `@supabase/supabase-js` 2.x, Zod 4, shadcn/ui 4 (Radix), Tailwind 4, `next/font` (Public Sans), Vitest.

**Spec:** `docs/superpowers/specs/2026-10-05-iteracion-1-base-design.md` (apartados 5 y 6) · Diseño: `DESIGN.md` y `docs/diseno/pantallas/mobile/01` a `03` y `08`.

## Global Constraints

- Todo lo del plan 1A sigue vigente: capas controladas por ESLint, claves solo en `.env.local`, commits convencionales con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, control de claves antes de cada commit.
- **Antes de escribir código de Next.js, leer la guía correspondiente en `node_modules/next/dist/docs/`** (lo exige `AGENTS.md`). Para este plan: `01-app/02-guides/forms.md`, `authentication.md`, `01-app/01-getting-started/16-proxy.md`.
- Textos visibles: español rioplatense, voseo en ayudas y errores, botones en infinitivo, mayúscula solo al inicio. Los textos de error salen de las fichas de casos de uso (Tablas 9 a 12 del informe).
- Colores, tipografía y radios **solo** desde los tokens del DESIGN.md. Ningún color escrito a mano en un componente.
- Botones principales y campos de 48 px de alto (`h-12`). Un solo botón azul por pantalla.
- Celular primero: todo funciona a 360 px de ancho sin desplazamiento horizontal (RNF-10).
- Ninguna página ni acción confía en `proxy.ts`: toda página protegida y toda acción llama a `exigirClaims()`.
- Las pruebas de integración y el registro real necesitan una red que permita el puerto 5432/6543 (la de la facultad no lo permite).

## Mapa de archivos

| Archivo | Responsabilidad |
|---|---|
| `src/app/globals.css` | Tokens del DESIGN.md sobre las variables de shadcn |
| `src/app/layout.tsx` | `lang="es-AR"`, Public Sans, metadatos |
| `src/app/page.tsx` | Redirige a `/vehiculos` |
| `src/components/ui/*` | Componentes de shadcn (Button, Input, Label, Dialog) |
| `src/components/logo.tsx` | Logo: cuadrado azul con llave inglesa en oro y el nombre |
| `src/components/campo.tsx` | Etiqueta + campo + ayuda + error, como define el DESIGN.md |
| `src/components/aviso.tsx` | Aviso en línea (información, advertencia, error, éxito) |
| `src/lib/supabase/server.ts`, `client.ts`, `proxy.ts` | Clientes de Supabase (código oficial del ejemplo de Next.js) |
| `src/lib/rutas.ts` | Qué rutas son públicas y a dónde va cada uno |
| `src/proxy.ts` | Renueva la sesión y redirige |
| `src/datos/sesion.ts` | `obtenerClaims()`, `exigirClaims()` |
| `src/datos/cuenta.ts` | `rolesDelUsuario(claims)` |
| `src/dominio/cuenta.ts` | Esquemas Zod de los formularios; `iniciales(email)`; `rutaSegura(next)` |
| `src/app/(auth)/…` | `ingresar`, `crear-cuenta`, `recuperar`, `recuperar/nueva` |
| `src/app/auth/confirmar/route.ts` | Verifica el enlace del correo |
| `src/app/(propietario)/layout.tsx` | Barra superior; exige sesión |
| `src/app/(propietario)/vehiculos/page.tsx` | Estado vacío (el contenido llega en el plan 1C) |
| `src/app/(propietario)/cuenta/page.tsx`, `src/app/cuenta/acciones.ts` | Mi cuenta, cerrar sesión, eliminar cuenta |
| `tests/unit/cuenta.test.ts`, `tests/unit/rutas.test.ts` | Validaciones y rutas |
| `tests/integracion/cuenta.test.ts` | Roles del usuario con RLS |

---

### Task 1: Configurar Supabase Auth (lo hace Felipe, guiado por el agente)

Sin código. El agente le dicta a Felipe cada valor y **se detiene** hasta que confirme.

- [ ] **Step 1: URLs** — Authentication → URL Configuration:
  - Site URL: `http://localhost:3000`
  - Redirect URLs: agregar `http://localhost:3000/**`

- [ ] **Step 2: Proveedor de correo** — Authentication → Sign In / Providers → Email:
  - Enable Email provider: activado
  - **Confirm email: activado** (RF-01)
  - Secure email change: activado
  - Minimum password length: **8** (RF-01)

- [ ] **Step 3: Sesiones** — Authentication → Sessions (o Settings):
  - Detect and revoke potentially compromised refresh tokens (rotación): activado (RNF-05)
  - Refresh token reuse interval: 10 s (valor por defecto)
  - JWT expiry / Access token expiry: **3600** s (RNF-05)
  - En Project Settings → JWT Keys: si el proyecto todavía usa el secreto compartido (legacy), elegir **Migrate to JWT signing keys** / crear la clave asimétrica, para que `getClaims()` verifique la firma localmente (spec, apartado 5).

- [ ] **Step 4: Plantillas de correo en español** — Authentication → Emails → Templates. Las plantillas usan `token_hash` porque la sesión se crea en el servidor (`/auth/confirmar`).

**Confirm signup** — Asunto: `Confirmá tu cuenta en Libreta de service`. Cuerpo:

```html
<h2>Confirmá tu cuenta</h2>
<p>Hola. Para activar tu cuenta en Libreta de service, abrí este enlace:</p>
<p><a href="{{ .SiteURL }}/auth/confirmar?token_hash={{ .TokenHash }}&type=email&next=/vehiculos">Confirmar mi cuenta</a></p>
<p>Si no creaste una cuenta, ignorá este correo.</p>
```

**Reset password** — Asunto: `Elegí una contraseña nueva`. Cuerpo:

```html
<h2>Recuperar contraseña</h2>
<p>Pediste elegir una contraseña nueva para Libreta de service. El enlace sirve una sola vez:</p>
<p><a href="{{ .SiteURL }}/auth/confirmar?token_hash={{ .TokenHash }}&type=recovery&next=/recuperar/nueva">Elegir contraseña nueva</a></p>
<p>Si no lo pediste, ignorá este correo: tu contraseña no cambia.</p>
```

- [ ] **Step 5: Confirmación** — Felipe confirma que guardó los cuatro pasos. Recordatorio: con el servidor de correo por defecto de Supabase solo llegan correos a las direcciones del equipo del proyecto (la de Felipe sí), con pocos envíos por hora. Resend se configura en el plan 1E.

---

### Task 2: Base visual — shadcn/ui, tokens del DESIGN.md y Public Sans

**Files:**
- Create: `components.json`, `src/components/ui/button.tsx`, `input.tsx`, `label.tsx`, `dialog.tsx`, `src/lib/utils.ts` (los genera shadcn), `src/components/logo.tsx`, `src/components/campo.tsx`, `src/components/aviso.tsx`
- Modify: `src/app/globals.css`, `src/app/layout.tsx`, `src/app/page.tsx`
- Delete: `public/*.svg` del ejemplo de Next

**Interfaces:**
- Produces: `<Logo />`; `<Campo id etiqueta nombre tipo? ayuda? error? valorInicial? sufijo? autoComplete? />`; `<Aviso tipo="info" | "advertencia" | "error" | "exito">texto</Aviso>`; clases de Tailwind `bg-oro`, `text-estado-vencido`, `bg-estado-vencido-fondo` (y equivalentes para `proximo`, `al-dia`, `confirmar`).

- [ ] **Step 1: Instalar shadcn con base Radix y los componentes**

```bash
npx shadcn@latest init --base radix --template next --yes
npx shadcn@latest add button input label dialog --yes
```

Expected: se crean `components.json`, `src/lib/utils.ts` y `src/components/ui/{button,input,label,dialog}.tsx`; `globals.css` queda con variables `--background`, `--primary`, etc. Si `init` pregunta algo igual, elegir: estilo por defecto, color base neutral, variables CSS sí.

- [ ] **Step 2: Reemplazar los valores de `:root` en `src/app/globals.css` por los del DESIGN.md**

Dentro del bloque `:root { … }` que generó shadcn, dejar estos valores (las variables que no aparecen acá quedan como estaban):

```css
  --radius: 0.625rem;
  --background: #f6f4ef;
  --foreground: #1b2430;
  --card: #ffffff;
  --card-foreground: #1b2430;
  --popover: #ffffff;
  --popover-foreground: #1b2430;
  --primary: #0b3d91;
  --primary-foreground: #ffffff;
  --secondary: #ffffff;
  --secondary-foreground: #1b2430;
  --muted: #efece5;
  --muted-foreground: #5a6472;
  --accent: #efece5;
  --accent-foreground: #1b2430;
  --destructive: #b42318;
  --border: #e3dfd6;
  --input: #8a8f98;
  --ring: #0b3d91;
  /* DESIGN.md: oro y semáforo */
  --oro: #f2b705;
  --estado-vencido: #b42318;
  --estado-vencido-fondo: #fee4e2;
  --estado-proximo: #9a3412;
  --estado-proximo-fondo: #ffedd5;
  --estado-al-dia: #1e6b43;
  --estado-al-dia-fondo: #e5f2ea;
  --estado-confirmar: #4b3fa3;
  --estado-confirmar-fondo: #edebfa;
  --estado-confirmar-borde: #8c82d6;
```

Dentro del bloque `@theme inline { … }`, agregar:

```css
  --font-sans: var(--font-public-sans);
  --color-oro: var(--oro);
  --color-estado-vencido: var(--estado-vencido);
  --color-estado-vencido-fondo: var(--estado-vencido-fondo);
  --color-estado-proximo: var(--estado-proximo);
  --color-estado-proximo-fondo: var(--estado-proximo-fondo);
  --color-estado-al-dia: var(--estado-al-dia);
  --color-estado-al-dia-fondo: var(--estado-al-dia-fondo);
  --color-estado-confirmar: var(--estado-confirmar);
  --color-estado-confirmar-fondo: var(--estado-confirmar-fondo);
  --color-estado-confirmar-borde: var(--estado-confirmar-borde);
```

Borrar el bloque `.dark { … }`: el DESIGN.md no define modo oscuro en esta fase (queda como nota para la tesis final).

- [ ] **Step 3: Layout raíz y página de inicio**

`src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { Public_Sans } from "next/font/google";
import "./globals.css";

const publicSans = Public_Sans({ subsets: ["latin"], variable: "--font-public-sans" });

export const metadata: Metadata = {
  title: "Libreta de service",
  description: "El mantenimiento de tu auto, según el plan del fabricante.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-AR" className={publicSans.variable}>
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">{children}</body>
    </html>
  );
}
```

`src/app/page.tsx`:

```tsx
import { redirect } from "next/navigation";

export default function Inicio() {
  redirect("/vehiculos");
}
```

```bash
rm -f public/file.svg public/globe.svg public/next.svg public/vercel.svg public/window.svg
```

- [ ] **Step 4: Componentes propios**

`src/components/logo.tsx`:

```tsx
import { Wrench } from "lucide-react";

export function Logo({ subtitulo }: { subtitulo?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex size-8 items-center justify-center rounded-md bg-primary" aria-hidden="true">
        <Wrench className="size-[18px] text-oro" strokeWidth={2.25} />
      </span>
      <span className="leading-tight">
        <span className="block text-[17px] font-semibold">Libreta de service</span>
        {subtitulo && <span className="block text-[13px] text-muted-foreground">{subtitulo}</span>}
      </span>
    </div>
  );
}
```

`src/components/campo.tsx`:

```tsx
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Props = {
  id: string;
  etiqueta: string;
  nombre: string;
  tipo?: string;
  ayuda?: string;
  error?: string;
  valorInicial?: string;
  sufijo?: string;
  autoComplete?: string;
  inputMode?: "text" | "numeric" | "email";
};

/** Etiqueta arriba, campo de 48 px, ayuda o error debajo (DESIGN.md, Components). */
export function Campo({ id, etiqueta, nombre, tipo = "text", ayuda, error, valorInicial, sufijo, autoComplete, inputMode }: Props) {
  const idAyuda = `${id}-ayuda`;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-medium">
        {etiqueta}
      </Label>
      <div className="relative">
        <Input
          id={id}
          name={nombre}
          type={tipo}
          defaultValue={valorInicial}
          autoComplete={autoComplete}
          inputMode={inputMode}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || ayuda ? idAyuda : undefined}
          className={cn(
            "h-12 bg-card text-base",
            sufijo && "pr-12",
            error && "border-destructive focus-visible:ring-destructive",
          )}
        />
        {sufijo && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
            {sufijo}
          </span>
        )}
      </div>
      {error ? (
        <p id={idAyuda} className="text-[13px] text-destructive">
          {error}
        </p>
      ) : (
        ayuda && (
          <p id={idAyuda} className="text-[13px] text-muted-foreground">
            {ayuda}
          </p>
        )
      )}
    </div>
  );
}
```

`src/components/aviso.tsx`:

```tsx
import { AlertTriangle, CircleCheck, Info, OctagonAlert } from "lucide-react";
import type { ReactNode } from "react";

const estilos = {
  info: { caja: "border-primary/30 bg-primary/5 text-primary", Icono: Info },
  advertencia: { caja: "border-estado-proximo/30 bg-estado-proximo-fondo text-estado-proximo", Icono: AlertTriangle },
  error: { caja: "border-estado-vencido/30 bg-estado-vencido-fondo text-estado-vencido", Icono: OctagonAlert },
  exito: { caja: "border-estado-al-dia/30 bg-estado-al-dia-fondo text-estado-al-dia", Icono: CircleCheck },
} as const;

export function Aviso({ tipo, children }: { tipo: keyof typeof estilos; children: ReactNode }) {
  const { caja, Icono } = estilos[tipo];
  return (
    <div role={tipo === "error" ? "alert" : "status"} className={`flex gap-2 rounded-[10px] border p-3 text-sm ${caja}`}>
      <Icono className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}
```

- [ ] **Step 5: Verificar**

```bash
npm run typecheck && npm run lint && npm run build
```

Expected: sin errores. (La ruta `/vehiculos` todavía no existe; el build no la necesita.)

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: base visual con shadcn/ui, tokens del DESIGN.md y Public Sans" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Reglas de dominio de la cuenta

**Files:**
- Create: `src/dominio/cuenta.ts`, `tests/unit/cuenta.test.ts`
- Modify: `package.json` (Zod)

**Interfaces:**
- Produces, en `@/dominio/cuenta`:
  - `esquemaCrearCuenta`, `esquemaIngresar`, `esquemaPedirEnlace`, `esquemaNuevaContrasena` (Zod).
  - `type ErroresCampo = Partial<Record<string, string>>` y `erroresDe(error: z.ZodError): ErroresCampo` (primer mensaje por campo).
  - `iniciales(email: string): string`.
  - `rutaSegura(next: string | null, porDefecto: string): string` (evita redirecciones abiertas).

- [ ] **Step 1: Instalar Zod**

```bash
npm install zod@4
```

- [ ] **Step 2: Escribir la prueba que falla**

`tests/unit/cuenta.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  erroresDe,
  esquemaCrearCuenta,
  esquemaNuevaContrasena,
  iniciales,
  rutaSegura,
} from "@/dominio/cuenta";

describe("esquemaCrearCuenta (RF-01, CU-01 4b)", () => {
  it("acepta un correo válido y 8 caracteres", () => {
    expect(esquemaCrearCuenta.safeParse({ email: "propietario@example.com", contrasena: "12345678" }).success).toBe(true);
  });

  it("rechaza una contraseña de menos de 8 caracteres con el mensaje de la ficha", () => {
    const r = esquemaCrearCuenta.safeParse({ email: "propietario@example.com", contrasena: "1234" });
    expect(r.success).toBe(false);
    expect(erroresDe(r.error!)).toEqual({ contrasena: "La contraseña tiene que tener al menos 8 caracteres." });
  });

  it("rechaza un correo con formato inválido", () => {
    const r = esquemaCrearCuenta.safeParse({ email: "no-es-un-correo", contrasena: "12345678" });
    expect(erroresDe(r.error!)).toEqual({ email: "Ingresá un correo electrónico válido." });
  });

  it("normaliza el correo a minúsculas y sin espacios", () => {
    const r = esquemaCrearCuenta.parse({ email: "  Propietario@Example.com ", contrasena: "12345678" });
    expect(r.email).toBe("propietario@example.com");
  });
});

describe("esquemaNuevaContrasena (CU-03 paso 4)", () => {
  it("exige que las dos contraseñas coincidan", () => {
    const r = esquemaNuevaContrasena.safeParse({ contrasena: "12345678", repetida: "12345679" });
    expect(erroresDe(r.error!)).toEqual({ repetida: "Las contraseñas no coinciden." });
  });
});

describe("iniciales", () => {
  it("toma la inicial de cada parte del nombre de usuario", () => {
    expect(iniciales("felipe.massone@example.com")).toBe("FM");
  });

  it("si no hay partes, toma las dos primeras letras", () => {
    expect(iniciales("propietario7@example.com")).toBe("PR");
  });
});

describe("rutaSegura", () => {
  it("acepta rutas internas", () => {
    expect(rutaSegura("/recuperar/nueva", "/vehiculos")).toBe("/recuperar/nueva");
  });

  it("rechaza destinos externos o ambiguos", () => {
    expect(rutaSegura("https://otro.sitio", "/vehiculos")).toBe("/vehiculos");
    expect(rutaSegura("//otro.sitio", "/vehiculos")).toBe("/vehiculos");
    expect(rutaSegura(null, "/vehiculos")).toBe("/vehiculos");
  });
});
```

- [ ] **Step 3: Verificar que falla**

Run: `npm test`
Expected: FAIL, `Cannot find package '@/dominio/cuenta'`.

- [ ] **Step 4: Implementar**

`src/dominio/cuenta.ts`:

```ts
import { z } from "zod";

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "Ingresá un correo electrónico válido." }));

const contrasena = z.string().min(8, { error: "La contraseña tiene que tener al menos 8 caracteres." });

export const esquemaCrearCuenta = z.object({ email, contrasena });

export const esquemaIngresar = z.object({
  email,
  contrasena: z.string().min(1, { error: "Ingresá tu contraseña." }),
});

export const esquemaPedirEnlace = z.object({ email });

export const esquemaNuevaContrasena = z
  .object({ contrasena, repetida: z.string() })
  .refine((d) => d.contrasena === d.repetida, { error: "Las contraseñas no coinciden.", path: ["repetida"] });

export type ErroresCampo = Partial<Record<string, string>>;

/** Primer mensaje de error por campo, para mostrar debajo de cada input. */
export function erroresDe(error: z.ZodError): ErroresCampo {
  const salida: ErroresCampo = {};
  for (const problema of error.issues) {
    const campo = String(problema.path[0] ?? "formulario");
    salida[campo] ??= problema.message;
  }
  return salida;
}

/** Iniciales para el botón de cuenta: "felipe.massone" → "FM"; "propietario7" → "PR". */
export function iniciales(correo: string): string {
  const usuario = correo.split("@")[0] ?? "";
  const partes = usuario.split(/[._-]+/).filter((p) => /[a-z]/i.test(p));
  const letras = partes.length >= 2 ? partes[0]![0]! + partes[1]![0]! : usuario.replace(/[^a-z]/gi, "").slice(0, 2);
  return letras.toUpperCase();
}

/** Solo rutas internas: evita usar el parámetro `next` para redirigir a otro sitio. */
export function rutaSegura(next: string | null, porDefecto: string): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return porDefecto;
  return next;
}
```

- [ ] **Step 5: Verificar que pasa**

Run: `npm test`
Expected: PASS, 16 pruebas (7 del plan 1A + 9 nuevas).

- [ ] **Step 6: Commit**

```bash
git add src/dominio/cuenta.ts tests/unit/cuenta.test.ts package.json package-lock.json
git commit -m "feat: validaciones de cuenta (RF-01), iniciales y redirección segura" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Clientes de Supabase, sesión y `proxy.ts`

El código de `src/lib/supabase/*` es el del ejemplo oficial `vercel/next.js/examples/with-supabase` (verificado el 05/10/2026), con dos cambios: no usa `hasEnvVars` y las rutas públicas salen de `src/lib/rutas.ts`.

**Files:**
- Create: `src/lib/supabase/server.ts`, `src/lib/supabase/client.ts`, `src/lib/supabase/proxy.ts`, `src/proxy.ts`, `src/lib/rutas.ts`, `src/datos/sesion.ts`, `tests/unit/rutas.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `ClaimsUsuario` de `@/datos/cliente-usuario`.
- Produces: `createClient()` en `@/lib/supabase/server` (async) y en `@/lib/supabase/client`; `esRutaPublica(ruta: string): boolean` y `esRutaDeIngreso(ruta: string): boolean` en `@/lib/rutas`; `obtenerClaims(): Promise<ClaimsUsuario | null>` y `exigirClaims(): Promise<ClaimsUsuario>` en `@/datos/sesion`.

- [ ] **Step 1: Instalar**

```bash
npm install @supabase/ssr
```

- [ ] **Step 2: Prueba de rutas que falla**

`tests/unit/rutas.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { esRutaDeIngreso, esRutaPublica } from "@/lib/rutas";

describe("rutas", () => {
  it("las pantallas de cuenta y el enlace del correo son públicas", () => {
    for (const r of ["/ingresar", "/crear-cuenta", "/recuperar", "/auth/confirmar"]) {
      expect(esRutaPublica(r)).toBe(true);
    }
  });

  it("la pantalla para elegir contraseña nueva exige la sesión que crea el enlace", () => {
    expect(esRutaPublica("/recuperar/nueva")).toBe(false);
  });

  it("el resto exige sesión", () => {
    for (const r of ["/", "/vehiculos", "/cuenta", "/admin"]) expect(esRutaPublica(r)).toBe(false);
  });

  it("identifica las pantallas de ingreso, que no tienen sentido con sesión", () => {
    expect(esRutaDeIngreso("/ingresar")).toBe(true);
    expect(esRutaDeIngreso("/crear-cuenta")).toBe(true);
    expect(esRutaDeIngreso("/recuperar")).toBe(true);
    expect(esRutaDeIngreso("/vehiculos")).toBe(false);
  });
});
```

Run: `npm test` → FAIL, `Cannot find package '@/lib/rutas'`.

- [ ] **Step 3: Implementar rutas**

`src/lib/rutas.ts`:

```ts
const DE_INGRESO = ["/ingresar", "/crear-cuenta", "/recuperar"];

export function esRutaDeIngreso(ruta: string): boolean {
  return DE_INGRESO.includes(ruta);
}

/** Rutas que se pueden ver sin sesión. `/recuperar/nueva` no: la sesión la crea el enlace del correo. */
export function esRutaPublica(ruta: string): boolean {
  return esRutaDeIngreso(ruta) || ruta.startsWith("/auth/");
}
```

Run: `npm test` → PASS, 20 pruebas.

- [ ] **Step 4: Clientes de Supabase**

`src/lib/supabase/server.ts`:

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** No guardar en una variable global: crear uno por solicitud. */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Llamado desde un Server Component: lo resuelve proxy.ts al renovar la sesión.
          }
        },
      },
    },
  );
}
```

`src/lib/supabase/client.ts`:

```ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
```

`src/lib/supabase/proxy.ts`:

```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { esRutaDeIngreso, esRutaPublica } from "@/lib/rutas";

/**
 * Renueva la sesión y redirige. NO es una barrera de seguridad (CVE-2025-29927):
 * cada página y cada acción vuelve a verificar con exigirClaims().
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
        },
      },
    },
  );

  // No ejecutar nada entre createServerClient y getClaims(): renueva la sesión.
  const { data } = await supabase.auth.getClaims();
  const hayUsuario = Boolean(data?.claims);
  const ruta = request.nextUrl.pathname;

  if (!hayUsuario && !esRutaPublica(ruta)) {
    const url = request.nextUrl.clone();
    url.pathname = "/ingresar";
    url.search = "";
    return NextResponse.redirect(url);
  }
  if (hayUsuario && esRutaDeIngreso(ruta)) {
    const url = request.nextUrl.clone();
    url.pathname = "/vehiculos";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
```

`src/proxy.ts`:

```ts
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
```

Nota: las redirecciones de `proxy.ts` no copian las cookies renovadas. Es lo que hace el ejemplo oficial y no afecta, porque la página de destino vuelve a renovar la sesión.

- [ ] **Step 5: Sesión en la capa de datos**

`src/datos/sesion.ts`:

```ts
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ClaimsUsuario } from "./cliente-usuario";

/** Claims del token verificado en el servidor (firma asimétrica). Null si no hay sesión válida. */
export async function obtenerClaims(): Promise<ClaimsUsuario | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) return null;
  return { sub: claims.sub, role: "authenticated", email: typeof claims.email === "string" ? claims.email : undefined };
}

/** Barrera real: toda página protegida y toda acción la llama. */
export async function exigirClaims(): Promise<ClaimsUsuario> {
  const claims = await obtenerClaims();
  if (!claims) redirect("/ingresar");
  return claims;
}
```

- [ ] **Step 6: Verificar y commit**

```bash
npm test && npm run typecheck && npm run lint
git add -A
git commit -m "feat: clientes de Supabase, proxy de sesión y barrera exigirClaims" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Crear cuenta y confirmar el correo (CU-01, RF-01)

**Files:**
- Create: `src/app/(auth)/layout.tsx`, `src/app/(auth)/acciones.ts`, `src/app/(auth)/crear-cuenta/page.tsx`, `src/app/(auth)/crear-cuenta/formulario.tsx`, `src/app/auth/confirmar/route.ts`

**Interfaces:**
- Consumes: `esquemaCrearCuenta`, `erroresDe`, `rutaSegura`; `Campo`, `Aviso`, `Logo`, `Button`.
- Produces: en `src/app/(auth)/acciones.ts`: `type EstadoFormulario = { errores?: ErroresCampo; mensaje?: string; enviadoA?: string; sinConfirmar?: string }`; `crearCuenta`, `reenviarConfirmacion` (las usan las Tasks 6 y 7, que agregan `ingresar`, `pedirEnlace`, `guardarContrasena` al mismo archivo).

- [ ] **Step 1: Layout de las pantallas de cuenta**

`src/app/(auth)/layout.tsx`:

```tsx
import { Logo } from "@/components/logo";

export default function LayoutCuenta({ children }: LayoutProps<"/">) {
  return (
    <main className="mx-auto w-full max-w-sm px-4 pb-10 pt-6">
      <Logo />
      <div className="mt-8">{children}</div>
    </main>
  );
}
```

Si `LayoutProps<"/">` no tipa en un grupo de rutas, usar `{ children }: { children: React.ReactNode }`.

- [ ] **Step 2: Acciones**

`src/app/(auth)/acciones.ts`:

```ts
"use server";

import { redirect } from "next/navigation";
import { erroresDe, esquemaCrearCuenta, type ErroresCampo } from "@/dominio/cuenta";
import { createClient } from "@/lib/supabase/server";

export type EstadoFormulario = {
  errores?: ErroresCampo;
  mensaje?: string;
  enviadoA?: string;
  sinConfirmar?: string;
};

const ERROR_GENERAL = "No pudimos completar la operación. Intentá de nuevo en unos minutos.";

/** CU-01: crea la cuenta pendiente y Supabase envía el enlace de confirmación. */
export async function crearCuenta(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const r = esquemaCrearCuenta.safeParse({ email: datos.get("email"), contrasena: datos.get("contrasena") });
  if (!r.success) return { errores: erroresDe(r.error) };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email: r.data.email, password: r.data.contrasena });
  if (error) {
    if (error.code === "weak_password") return { errores: { contrasena: "Esa contraseña es demasiado débil. Probá con otra." } };
    if (error.code === "over_email_send_rate_limit") return { mensaje: "Mandamos demasiados correos. Esperá unos minutos y volvé a intentar." };
    return { mensaje: ERROR_GENERAL };
  }
  // Con confirmación activada, Supabase no devuelve error si el correo ya existe: devuelve un usuario sin identidades.
  if (data.user && data.user.identities?.length === 0) {
    return { errores: { email: "Ya existe una cuenta con ese correo. Ingresá o recuperá tu contraseña." } };
  }
  return { enviadoA: r.data.email };
}

/** CU-01 6a y CU-02 2b: reenvía el enlace de confirmación. */
export async function reenviarConfirmacion(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const email = String(datos.get("email") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({ type: "signup", email });
  if (error) return { enviadoA: email, mensaje: "No pudimos reenviar el enlace. Esperá unos minutos y volvé a intentar." };
  return { enviadoA: email, mensaje: "Te mandamos un enlace nuevo." };
}

/** CU-02: cierra la sesión y revoca el token de actualización (RF-02). */
export async function cerrarSesion(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/ingresar");
}
```

- [ ] **Step 3: Pantalla**

`src/app/(auth)/crear-cuenta/page.tsx`:

```tsx
import type { Metadata } from "next";
import { FormularioCrearCuenta } from "./formulario";

export const metadata: Metadata = { title: "Crear cuenta · Libreta de service" };

export default function CrearCuentaPagina() {
  return <FormularioCrearCuenta />;
}
```

`src/app/(auth)/crear-cuenta/formulario.tsx`:

```tsx
"use client";

import { Mail } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { Aviso } from "@/components/aviso";
import { Campo } from "@/components/campo";
import { Button } from "@/components/ui/button";
import { crearCuenta, reenviarConfirmacion, type EstadoFormulario } from "../acciones";

export function FormularioCrearCuenta() {
  const [estado, enviar, enviando] = useActionState<EstadoFormulario, FormData>(crearCuenta, {});
  const [reenvio, reenviar, reenviando] = useActionState<EstadoFormulario, FormData>(reenviarConfirmacion, {});

  if (estado.enviadoA) {
    return (
      <section className="space-y-4">
        <Mail className="size-6 text-primary" aria-hidden="true" />
        <h1 className="text-[22px] font-semibold">Revisá tu correo</h1>
        <p className="text-muted-foreground">
          Te mandamos un enlace a <strong className="font-semibold text-foreground">{estado.enviadoA}</strong>.
          Abrilo para activar tu cuenta. Si no lo ves, fijate en la carpeta de correo no deseado.
        </p>
        {reenvio.mensaje && <Aviso tipo="info">{reenvio.mensaje}</Aviso>}
        <form action={reenviar}>
          <input type="hidden" name="email" value={estado.enviadoA} />
          <Button type="submit" variant="outline" className="h-12 w-full" disabled={reenviando}>
            Reenviar enlace
          </Button>
        </form>
        <Link href="/ingresar" className="inline-block text-sm text-primary underline underline-offset-4">
          Volver a ingresar
        </Link>
      </section>
    );
  }

  return (
    <section>
      <h1 className="text-[22px] font-semibold">Crear cuenta</h1>
      <p className="mt-1 text-sm text-muted-foreground">Solo te pedimos un correo y una contraseña.</p>
      <form action={enviar} className="mt-6 space-y-4" noValidate>
        {estado.mensaje && <Aviso tipo="error">{estado.mensaje}</Aviso>}
        <Campo id="email" etiqueta="Correo electrónico" nombre="email" tipo="email" autoComplete="email" inputMode="email" error={estado.errores?.email} />
        <Campo id="contrasena" etiqueta="Contraseña" nombre="contrasena" tipo="password" autoComplete="new-password" ayuda="Mínimo 8 caracteres." error={estado.errores?.contrasena} />
        <Button type="submit" className="h-12 w-full" disabled={enviando}>
          Crear cuenta
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        ¿Ya tenés cuenta?{" "}
        <Link href="/ingresar" className="text-primary underline underline-offset-4">
          Ingresar
        </Link>
      </p>
    </section>
  );
}
```

Nota de diseño: al reenviar el formulario, los valores escritos se pierden con `useActionState` (React 19 resetea el formulario). Para conservar el correo cuando hay un error, agregar `valorInicial={...}` devolviendo el email en el estado si se ve molesto en la verificación manual; no es requisito de la ficha.

- [ ] **Step 4: Verificación del enlace del correo**

`src/app/auth/confirmar/route.ts`:

```ts
import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";
import { rutaSegura } from "@/dominio/cuenta";
import { createClient } from "@/lib/supabase/server";

/** CU-01 pasos 6–7 y CU-03 paso 3: valida el enlace de un solo uso y abre la sesión. */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = rutaSegura(searchParams.get("next"), "/vehiculos");

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) redirect(next);
  }
  // CU-01 6a / CU-03 3a: enlace usado o vencido
  redirect(type === "recovery" ? "/recuperar?enlace=invalido" : "/ingresar?enlace=invalido");
}
```

- [ ] **Step 5: Verificar compilación y commit**

```bash
npm run typecheck && npm run lint && npm run build
git add -A
git commit -m "feat: crear cuenta con confirmación de correo (CU-01, RF-01)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Ingresar y cerrar sesión (CU-02, RF-02)

**Files:**
- Create: `src/app/(auth)/ingresar/page.tsx`, `src/app/(auth)/ingresar/formulario.tsx`
- Modify: `src/app/(auth)/acciones.ts`

**Interfaces:**
- Consumes: `EstadoFormulario`, `reenviarConfirmacion`, `esquemaIngresar`.
- Produces: `ingresar(previo, datos)` en `src/app/(auth)/acciones.ts`.

- [ ] **Step 1: Acción**

Agregar a `src/app/(auth)/acciones.ts` (y sumar `esquemaIngresar` al import de `@/dominio/cuenta`):

```ts
/** CU-02: valida las credenciales y abre la sesión. */
export async function ingresar(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const r = esquemaIngresar.safeParse({ email: datos.get("email"), contrasena: datos.get("contrasena") });
  if (!r.success) return { errores: erroresDe(r.error) };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: r.data.email, password: r.data.contrasena });
  if (error) {
    // 2b: cuenta sin confirmar
    if (error.code === "email_not_confirmed") return { sinConfirmar: r.data.email };
    // 2a: no se indica cuál de los dos datos es incorrecto
    if (error.code === "invalid_credentials") return { mensaje: "El correo o la contraseña no son válidos." };
    return { mensaje: ERROR_GENERAL };
  }
  redirect("/vehiculos");
}
```

- [ ] **Step 2: Pantalla**

`src/app/(auth)/ingresar/page.tsx`:

```tsx
import type { Metadata } from "next";
import { FormularioIngresar } from "./formulario";

export const metadata: Metadata = { title: "Ingresar · Libreta de service" };

export default async function IngresarPagina({ searchParams }: PageProps<"/ingresar">) {
  const { enlace, cuenta } = await searchParams;
  return <FormularioIngresar enlaceInvalido={enlace === "invalido"} cuentaEliminada={cuenta === "eliminada"} />;
}
```

Si `PageProps<"/ingresar">` no resuelve en un grupo de rutas, usar `{ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }`.

`src/app/(auth)/ingresar/formulario.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Aviso } from "@/components/aviso";
import { Campo } from "@/components/campo";
import { Button } from "@/components/ui/button";
import { ingresar, reenviarConfirmacion, type EstadoFormulario } from "../acciones";

export function FormularioIngresar({ enlaceInvalido, cuentaEliminada }: { enlaceInvalido: boolean; cuentaEliminada: boolean }) {
  const [estado, enviar, enviando] = useActionState<EstadoFormulario, FormData>(ingresar, {});
  const [reenvio, reenviar, reenviando] = useActionState<EstadoFormulario, FormData>(reenviarConfirmacion, {});
  const [ver, setVer] = useState(false);

  return (
    <section>
      <h1 className="text-[22px] font-semibold">Ingresar</h1>
      <div className="mt-4 space-y-3">
        {cuentaEliminada && <Aviso tipo="exito">Tu cuenta y todos sus datos se eliminaron.</Aviso>}
        {enlaceInvalido && <Aviso tipo="advertencia">El enlace ya fue usado o venció. Ingresá con tu contraseña o pedí uno nuevo.</Aviso>}
        {estado.mensaje && <Aviso tipo="error">{estado.mensaje}</Aviso>}
        {estado.sinConfirmar && (
          <Aviso tipo="advertencia">
            Todavía no confirmaste tu cuenta. Revisá tu correo o pedí un enlace nuevo.
            <form action={reenviar} className="mt-2">
              <input type="hidden" name="email" value={estado.sinConfirmar} />
              <button type="submit" disabled={reenviando} className="font-medium underline underline-offset-4">
                Reenviar enlace
              </button>
            </form>
            {reenvio.mensaje && <p className="mt-1">{reenvio.mensaje}</p>}
          </Aviso>
        )}
      </div>
      <form action={enviar} className="mt-6 space-y-4" noValidate>
        <Campo id="email" etiqueta="Correo electrónico" nombre="email" tipo="email" autoComplete="email" inputMode="email" error={estado.errores?.email} />
        <div className="relative">
          <Campo id="contrasena" etiqueta="Contraseña" nombre="contrasena" tipo={ver ? "text" : "password"} autoComplete="current-password" error={estado.errores?.contrasena} />
          <button
            type="button"
            onClick={() => setVer((v) => !v)}
            aria-label={ver ? "Ocultar contraseña" : "Mostrar contraseña"}
            className="absolute right-3 top-[38px] p-1 text-muted-foreground"
          >
            {ver ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
          </button>
        </div>
        <div className="text-right">
          <Link href="/recuperar" className="text-sm text-primary underline underline-offset-4">
            Olvidé mi contraseña
          </Link>
        </div>
        <Button type="submit" className="h-12 w-full" disabled={enviando}>
          Ingresar
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        ¿No tenés cuenta?{" "}
        <Link href="/crear-cuenta" className="text-primary underline underline-offset-4">
          Crear cuenta
        </Link>
      </p>
    </section>
  );
}
```

- [ ] **Step 3: Verificar y commit**

```bash
npm run typecheck && npm run lint && npm run build
git add -A
git commit -m "feat: ingresar y cerrar sesión (CU-02, RF-02)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Recuperar contraseña (CU-03, RF-03)

**Files:**
- Create: `src/app/(auth)/recuperar/page.tsx`, `src/app/(auth)/recuperar/formulario.tsx`, `src/app/(auth)/recuperar/nueva/page.tsx`, `src/app/(auth)/recuperar/nueva/formulario.tsx`
- Modify: `src/app/(auth)/acciones.ts`

**Interfaces:**
- Produces: `pedirEnlace(previo, datos)` y `guardarContrasena(previo, datos)` en `src/app/(auth)/acciones.ts`.

- [ ] **Step 1: Acciones**

Agregar a `src/app/(auth)/acciones.ts` (y sumar `esquemaPedirEnlace`, `esquemaNuevaContrasena` al import; e `import { exigirClaims } from "@/datos/sesion";`):

```ts
/** CU-03 pasos 1–2. Responde igual exista o no la cuenta (2a). */
export async function pedirEnlace(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  const r = esquemaPedirEnlace.safeParse({ email: datos.get("email") });
  if (!r.success) return { errores: erroresDe(r.error) };
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(r.data.email);
  if (error?.code === "over_email_send_rate_limit") {
    return { mensaje: "Mandamos demasiados correos. Esperá unos minutos y volvé a intentar." };
  }
  return { enviadoA: r.data.email };
}

/** CU-03 paso 4. La sesión la abrió el enlace del correo en /auth/confirmar. */
export async function guardarContrasena(_previo: EstadoFormulario, datos: FormData): Promise<EstadoFormulario> {
  await exigirClaims();
  const r = esquemaNuevaContrasena.safeParse({ contrasena: datos.get("contrasena"), repetida: datos.get("repetida") });
  if (!r.success) return { errores: erroresDe(r.error) };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: r.data.contrasena });
  if (error?.code === "same_password") return { errores: { contrasena: "Elegí una contraseña distinta de la anterior." } };
  if (error) return { mensaje: ERROR_GENERAL };
  redirect("/vehiculos");
}
```

- [ ] **Step 2: Pantallas**

`src/app/(auth)/recuperar/page.tsx`:

```tsx
import type { Metadata } from "next";
import { FormularioRecuperar } from "./formulario";

export const metadata: Metadata = { title: "Recuperar contraseña · Libreta de service" };

export default async function RecuperarPagina({ searchParams }: PageProps<"/recuperar">) {
  const { enlace } = await searchParams;
  return <FormularioRecuperar enlaceInvalido={enlace === "invalido"} />;
}
```

`src/app/(auth)/recuperar/formulario.tsx`:

```tsx
"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { Aviso } from "@/components/aviso";
import { Campo } from "@/components/campo";
import { Button } from "@/components/ui/button";
import { pedirEnlace, type EstadoFormulario } from "../acciones";

export function FormularioRecuperar({ enlaceInvalido }: { enlaceInvalido: boolean }) {
  const [estado, enviar, enviando] = useActionState<EstadoFormulario, FormData>(pedirEnlace, {});

  return (
    <section>
      <Link href="/ingresar" className="mb-4 inline-flex items-center gap-1 text-sm text-foreground">
        <ArrowLeft className="size-4" aria-hidden="true" /> Volver
      </Link>
      <h1 className="text-[22px] font-semibold">Recuperar contraseña</h1>
      {estado.enviadoA ? (
        <div className="mt-4">
          <Aviso tipo="info">
            Si existe una cuenta con {estado.enviadoA}, te mandamos un enlace para elegir una contraseña nueva. Sirve una sola vez.
          </Aviso>
        </div>
      ) : (
        <>
          <p className="mt-1 text-sm text-muted-foreground">
            Ingresá el correo de tu cuenta y te mandamos un enlace para elegir una contraseña nueva.
          </p>
          <form action={enviar} className="mt-6 space-y-4" noValidate>
            {enlaceInvalido && <Aviso tipo="advertencia">El enlace ya fue usado o venció. Pedí uno nuevo.</Aviso>}
            {estado.mensaje && <Aviso tipo="error">{estado.mensaje}</Aviso>}
            <Campo id="email" etiqueta="Correo electrónico" nombre="email" tipo="email" autoComplete="email" inputMode="email" error={estado.errores?.email} />
            <Button type="submit" className="h-12 w-full" disabled={enviando}>
              Enviar enlace
            </Button>
          </form>
        </>
      )}
      <p className="mt-6 text-center text-sm text-muted-foreground">
        ¿Te acordaste de la contraseña?{" "}
        <Link href="/ingresar" className="text-primary underline underline-offset-4">
          Ingresar
        </Link>
      </p>
    </section>
  );
}
```

`src/app/(auth)/recuperar/nueva/page.tsx`:

```tsx
import type { Metadata } from "next";
import { exigirClaims } from "@/datos/sesion";
import { FormularioNuevaContrasena } from "./formulario";

export const metadata: Metadata = { title: "Contraseña nueva · Libreta de service" };

export default async function NuevaContrasenaPagina() {
  await exigirClaims();
  return <FormularioNuevaContrasena />;
}
```

`src/app/(auth)/recuperar/nueva/formulario.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Aviso } from "@/components/aviso";
import { Campo } from "@/components/campo";
import { Button } from "@/components/ui/button";
import { guardarContrasena, type EstadoFormulario } from "../../acciones";

export function FormularioNuevaContrasena() {
  const [estado, enviar, enviando] = useActionState<EstadoFormulario, FormData>(guardarContrasena, {});

  return (
    <section>
      <h1 className="text-[22px] font-semibold">Elegí una contraseña nueva</h1>
      <form action={enviar} className="mt-6 space-y-4" noValidate>
        {estado.mensaje && <Aviso tipo="error">{estado.mensaje}</Aviso>}
        <Campo id="contrasena" etiqueta="Contraseña nueva" nombre="contrasena" tipo="password" autoComplete="new-password" ayuda="Mínimo 8 caracteres." error={estado.errores?.contrasena} />
        <Campo id="repetida" etiqueta="Repetí la contraseña" nombre="repetida" tipo="password" autoComplete="new-password" error={estado.errores?.repetida} />
        <Button type="submit" className="h-12 w-full" disabled={enviando}>
          Guardar contraseña
        </Button>
      </form>
      <Link href="/ingresar" className="mt-6 inline-block text-sm text-primary underline underline-offset-4">
        Volver a ingresar
      </Link>
    </section>
  );
}
```

Nota: `/recuperar/nueva` está dentro de `(auth)` para compartir el layout, pero **no** es pública (Task 4, `esRutaPublica`), y `esRutaDeIngreso` no la incluye, así que el proxy no redirige a quien llega con la sesión del enlace.

- [ ] **Step 3: Verificar y commit**

```bash
npm run typecheck && npm run lint && npm run build
git add -A
git commit -m "feat: recuperar contraseña con enlace de un solo uso (CU-03, RF-03)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Estructura del propietario, Mi cuenta y eliminar cuenta (CU-04, RF-04)

**Files:**
- Create: `src/datos/cuenta.ts`, `tests/integracion/cuenta.test.ts`, `src/app/(propietario)/layout.tsx`, `src/app/(propietario)/vehiculos/page.tsx`, `src/app/(propietario)/cuenta/page.tsx`, `src/app/(propietario)/cuenta/eliminar.tsx`, `src/app/cuenta/acciones.ts`

**Interfaces:**
- Consumes: `conUsuario`, `exigirClaims`, `supabaseAdmin`, `iniciales`, `cerrarSesion`.
- Produces: `rolesDelUsuario(claims: ClaimsUsuario): Promise<string[]>` en `@/datos/cuenta`; `eliminarCuenta(previo: { error?: string }, datos: FormData): Promise<{ error?: string }>` en `src/app/cuenta/acciones.ts`.

- [ ] **Step 1: Prueba de integración que falla**

`tests/integracion/cuenta.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { rolesDelUsuario } from "@/datos/cuenta";
import { asignarRol, borrarUsuarioPrueba, claimsDe, crearUsuarioPrueba } from "./ayudantes";

let propietario: string;
let admin: string;

beforeAll(async () => {
  propietario = await crearUsuarioPrueba("roles-p");
  admin = await crearUsuarioPrueba("roles-a");
  await asignarRol(admin, 2);
});

afterAll(async () => {
  await borrarUsuarioPrueba(propietario);
  await borrarUsuarioPrueba(admin);
});

describe("rolesDelUsuario", () => {
  it("un usuario nuevo es solo propietario", async () => {
    expect(await rolesDelUsuario(claimsDe(propietario))).toEqual(["propietario"]);
  });

  it("lee los roles adicionales, ordenados", async () => {
    expect(await rolesDelUsuario(claimsDe(admin))).toEqual(["administrador_catalogo", "propietario"]);
  });
});
```

Run: `npm run test:integracion` → FAIL, `Cannot find package '@/datos/cuenta'`.

- [ ] **Step 2: Implementar `rolesDelUsuario`**

`src/datos/cuenta.ts`:

```ts
import { conUsuario, type ClaimsUsuario } from "./cliente-usuario";

/** Roles de la cuenta, leídos con RLS (cada uno solo ve los suyos). */
export async function rolesDelUsuario(claims: ClaimsUsuario): Promise<string[]> {
  const filas = await conUsuario(claims, (tx) => tx.usuarioRol.findMany({ include: { rol: true } }));
  return filas.map((f) => f.rol.nombre).sort();
}
```

Run: `npm run test:integracion` → PASS (24 pruebas).

- [ ] **Step 3: Acción de eliminar cuenta**

`src/app/cuenta/acciones.ts` (único archivo de `src/app` autorizado por ESLint a usar `privilegiado`):

```ts
"use server";

import { createClient as clienteSinSesion } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/datos/privilegiado";
import { exigirClaims } from "@/datos/sesion";
import { createClient } from "@/lib/supabase/server";

/** CU-04: reverifica la contraseña (paso 3) y elimina la cuenta; la cascada borra todo (RF-04). */
export async function eliminarCuenta(_previo: { error?: string }, datos: FormData): Promise<{ error?: string }> {
  const claims = await exigirClaims();
  const contrasena = String(datos.get("contrasena") ?? "");
  if (!claims.email || !contrasena) return { error: "Ingresá tu contraseña para confirmar." };

  // Cliente sin cookies: verificar la contraseña no debe tocar la sesión actual.
  const verificador = clienteSinSesion(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { error: errorClave } = await verificador.auth.signInWithPassword({ email: claims.email, password: contrasena });
  if (errorClave) return { error: "La contraseña no es correcta." }; // 3b
  await verificador.auth.signOut();

  const { error } = await supabaseAdmin().auth.admin.deleteUser(claims.sub);
  if (error) return { error: "No pudimos eliminar la cuenta. Intentá de nuevo en unos minutos." };

  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/ingresar?cuenta=eliminada");
}
```

- [ ] **Step 4: Layout del propietario**

`src/app/(propietario)/layout.tsx`:

```tsx
import Link from "next/link";
import { Logo } from "@/components/logo";
import { exigirClaims } from "@/datos/sesion";
import { iniciales } from "@/dominio/cuenta";

export default async function LayoutPropietario({ children }: { children: React.ReactNode }) {
  const claims = await exigirClaims();
  return (
    <>
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex h-14 w-full max-w-[720px] items-center justify-between px-4">
          <Link href="/vehiculos" aria-label="Mis vehículos">
            <Logo />
          </Link>
          <Link
            href="/cuenta"
            aria-label="Mi cuenta"
            className="flex size-9 items-center justify-center rounded-full bg-primary text-[13px] font-semibold text-primary-foreground"
          >
            {iniciales(claims.email ?? "")}
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[720px] px-4 pb-10 pt-6">{children}</main>
    </>
  );
}
```

`src/app/(propietario)/vehiculos/page.tsx` (el listado real llega en el plan 1C):

```tsx
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mis vehículos · Libreta de service" };

export default function VehiculosPagina() {
  return (
    <section>
      <h1 className="text-[22px] font-semibold">Mis vehículos</h1>
      <p className="mt-6">Todavía no cargaste ningún vehículo.</p>
      <p className="mt-1 text-sm text-muted-foreground">Cargá tu auto y te decimos qué mantenimiento le toca.</p>
    </section>
  );
}
```

- [ ] **Step 5: Mi cuenta**

`src/app/(propietario)/cuenta/page.tsx`:

```tsx
import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { cerrarSesion } from "@/app/(auth)/acciones";
import { rolesDelUsuario } from "@/datos/cuenta";
import { exigirClaims } from "@/datos/sesion";
import { EliminarCuenta } from "./eliminar";

export const metadata: Metadata = { title: "Mi cuenta · Libreta de service" };

const NOMBRE_ROL: Record<string, string> = {
  propietario: "Propietario",
  administrador_catalogo: "Administrador de catálogo",
  administrador_tecnico: "Administrador técnico",
};

export default async function CuentaPagina() {
  const claims = await exigirClaims();
  const roles = await rolesDelUsuario(claims);
  const esAdmin = roles.includes("administrador_catalogo");

  return (
    <section>
      <h1 className="text-[22px] font-semibold">Mi cuenta</h1>
      <div className="mt-6">
        <p className="font-semibold">{claims.email}</p>
        <p className="text-sm text-muted-foreground">{roles.map((r) => NOMBRE_ROL[r] ?? r).join(" · ")}</p>
      </div>
      <ul className="mt-6 divide-y divide-border overflow-hidden rounded-[14px] border border-border bg-card">
        {esAdmin && (
          <li>
            <Link href="/admin" className="flex h-12 items-center justify-between px-4">
              Cambiar a Administración <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
            </Link>
          </li>
        )}
        <li>
          <form action={cerrarSesion}>
            <button type="submit" className="flex h-12 w-full items-center px-4 text-left">
              Cerrar sesión
            </button>
          </form>
        </li>
      </ul>
      <div className="mt-8 overflow-hidden rounded-[14px] border border-border bg-card">
        <EliminarCuenta />
      </div>
    </section>
  );
}
```

`src/app/(propietario)/cuenta/eliminar.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import { eliminarCuenta } from "@/app/cuenta/acciones";
import { Campo } from "@/components/campo";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/** CU-04: advertencia, contraseña y confirmación. */
export function EliminarCuenta() {
  const [estado, enviar, enviando] = useActionState(eliminarCuenta, {});

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className="flex h-12 w-full items-center px-4 text-left text-destructive">
          Eliminar mi cuenta
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100%-2rem)] rounded-[14px] sm:max-w-md">
        <DialogHeader className="text-left">
          <DialogTitle>¿Eliminar tu cuenta?</DialogTitle>
          <DialogDescription>
            Se van a borrar tus vehículos, sus trabajos registrados y los comprobantes. No se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        <form action={enviar} className="space-y-4">
          <Campo id="contrasena-eliminar" etiqueta="Ingresá tu contraseña para confirmar" nombre="contrasena" tipo="password" autoComplete="current-password" error={estado.error} />
          <DialogFooter className="flex-row gap-2 sm:justify-stretch">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="h-12 flex-1">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" variant="destructive" className="h-12 flex-1" disabled={enviando}>
              Eliminar cuenta
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

Si el `dialog.tsx` que generó shadcn no exporta alguno de estos nombres, abrir el archivo y usar los que exporte con la misma función.

- [ ] **Step 6: Verificar y commit**

```bash
npm test && npm run test:integracion && npm run typecheck && npm run lint && npm run build
git add -A
git commit -m "feat: estructura del propietario, Mi cuenta y eliminar cuenta (CU-04, RF-04)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Verificación manual con Felipe, roles de administrador y pull request

Felipe hace los pasos que usan su correo y su contraseña reales; el agente nunca los escribe.

- [ ] **Step 1 (agente): levantar la aplicación**

Crear `.claude/launch.json` en `app/` (si no existe) con la configuración `dev` (`npm run dev`, puerto 3000) y abrirla con la vista previa del navegador. Revisar con capturas a 360 px de ancho: `/ingresar`, `/crear-cuenta`, `/recuperar`. Comparar con `docs/diseno/pantallas/mobile/01` a `03` y anotar diferencias.

- [ ] **Step 2 (Felipe): crear su cuenta** en `http://localhost:3000/crear-cuenta` con su correo real (el de `ADMIN_EMAIL`), abrir el enlace del correo y verificar que entra a "Mis vehículos".

- [ ] **Step 3 (agente): asignar los roles de administrador**

```bash
npx prisma db seed
```

Expected: `Roles de administrador asignados a ADMIN_EMAIL.`

- [ ] **Step 4 (Felipe): recorrer los flujos y reportar**
  1. "Mi cuenta" muestra su correo, "Administrador de catálogo · Administrador técnico · Propietario" y la fila "Cambiar a Administración" (que todavía lleva a una página inexistente: llega en el plan 1D). Los roles nuevos se ven después del próximo ingreso o renovación del token (RNF-05).
  2. Cerrar sesión → vuelve a "Ingresar"; ir a `/vehiculos` redirige a "Ingresar".
  3. Ingresar con una contraseña incorrecta → "El correo o la contraseña no son válidos."
  4. Recuperar contraseña → llega el correo → elegir una nueva → entra a "Mis vehículos".
  5. Abrir de nuevo el mismo enlace de recuperación → "El enlace ya fue usado o venció".
  6. **No** probar "Eliminar mi cuenta" con la cuenta real: se prueba en el plan 1E con una cuenta descartable en la prueba de punta a punta.

- [ ] **Step 5 (agente): corregir lo que se encuentre**, con un commit por corrección.

- [ ] **Step 6: Pull request** (con confirmación de Felipe antes del push)

```bash
git push -u origin iteracion-1b-autenticacion
gh pr create --base main --title "Iteración 1B: autenticación y estructura visual" --body "<resumen + pruebas>"
```

Después: leer el estado de CI con `mcp__ccd_pr__get_status` (sin sondear), y unir cuando esté en verde.

## Criterio de terminado del plan 1B

1. `npm test` (20), `npm run test:integracion` (24), `typecheck`, `lint` y `build` en verde.
2. Felipe completó los pasos 2 y 4 de la Task 9 sin errores.
3. Las pantallas a 360 px se corresponden con los mockups 01, 02, 03 y 08 (diferencias anotadas y justificadas).
4. CI en verde y PR unido a `main`.
