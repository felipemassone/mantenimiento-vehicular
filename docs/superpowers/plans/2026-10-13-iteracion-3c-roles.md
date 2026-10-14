# Iteración 3C — Roles (funciones SQL y datos): plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el administrador técnico pueda buscar una cuenta por correo exacto y otorgarle o revocarle el rol de administrador de catálogo (CU-18, RF-21), sin pantallas.

**Architecture:** La migración `0005_roles` crea dos funciones `SECURITY DEFINER` con `search_path` vacío que primero exigen `tiene_rol('administrador_tecnico')`: `buscar_cuenta(correo)` y `cambiar_rol_catalogo(usuario, otorgar)`. No se agrega ninguna política de lectura sobre `usuario` (permitiría listar cuentas, RNF-06). `src/datos/roles.ts` las llama dentro de `conUsuario` (RLS, `auth.uid()` del token); la validación de la entrada es pura en `src/dominio/`.

**Tech Stack:** PostgreSQL (Supabase) con Prisma 7 (`$queryRaw`), zod, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-13-iteracion-3-registro-design.md`, apartados 5, 6 y 8.

## Global Constraints

- Búsqueda por correo **exacto**, sin distinguir mayúsculas; sin listados ni búsqueda parcial (RNF-06).
- Solo se otorga o revoca `administrador_catalogo` (RF-21); `propietario` y `administrador_tecnico` no se tocan.
- Funciones `SECURITY DEFINER` con `SET search_path = ''`, nombres calificados con esquema, y la verificación del rol del que llama **antes** de cualquier lectura. `EXECUTE` revocado a `PUBLIC` y `anon`, otorgado a `authenticated`.
- El cambio rige en el siguiente pedido (la app lee los roles de la base en cada pedido): RNF-05 (≤ 60 min) con margen. Se anota en `docs/cambios-para-el-informe.md` (CU-18, paso 4).
- Mensajes en castellano rioplatense. Sin pantallas (plan 3D). Un PR, con los tres checks.

## Review Focus

1. Correo con mayúsculas o espacios alrededor → encuentra la cuenta (prueba en Task 2).
2. Correo parcial o con comodines (`prueba-%`, un prefijo) → no encuentra nada (Task 2).
3. Otorgar dos veces o revocar a quien no lo tiene → sin error y sin filas duplicadas (Task 2).
4. Llamar a las funciones por la API REST de Supabase (`rpc`) sin sesión o como propietario → rechazo (Task 2).
5. Id de cuenta inexistente o mal formado → "No encontramos la cuenta.", sin excepción (Task 2).

---

### Task 1: Validación de la entrada (dominio)

**Files:**
- Modify: `src/dominio/cuenta.ts` (exportar `esquemaBuscarCuenta`)
- Create: `src/dominio/roles.ts`
- Test: `tests/unit/cuenta.test.ts`, `tests/unit/roles.test.ts`

**Interfaces:**
- Produces: `esquemaBuscarCuenta: z.ZodObject<{ email }>` (correo recortado y en minúsculas); `esquemaCambiarRol: z.ZodObject<{ usuarioId: string; otorgar: boolean }>` con `otorgar` leído de `"1"` / `"0"`.

- [ ] **Step 1: Pruebas que fallan**

En `tests/unit/cuenta.test.ts` (sumar `esquemaBuscarCuenta` al import):

```ts
describe("esquemaBuscarCuenta (CU-18)", () => {
  it("normaliza el correo buscado", () => {
    expect(esquemaBuscarCuenta.parse({ email: "  Otro@Example.COM " }).email).toBe("otro@example.com");
  });

  it("rechaza un texto que no es un correo completo (sin búsqueda parcial)", () => {
    const r = esquemaBuscarCuenta.safeParse({ email: "otro@" });
    expect(erroresDe(r.error!)).toEqual({ email: "Ingresá un correo electrónico válido." });
  });
});
```

`tests/unit/roles.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { erroresDe } from "@/dominio/cuenta";
import { esquemaCambiarRol } from "@/dominio/roles";

const ID = "0f8fad5b-d9cb-469f-a165-70867728950e";

describe("esquemaCambiarRol (CU-18, RF-21)", () => {
  it('"1" otorga y "0" revoca', () => {
    expect(esquemaCambiarRol.parse({ usuarioId: ID, otorgar: "1" })).toEqual({ usuarioId: ID, otorgar: true });
    expect(esquemaCambiarRol.parse({ usuarioId: ID, otorgar: "0" })).toEqual({ usuarioId: ID, otorgar: false });
  });

  it("rechaza un id que no es uuid", () => {
    const r = esquemaCambiarRol.safeParse({ usuarioId: "1 OR 1=1", otorgar: "1" });
    expect(erroresDe(r.error!)).toEqual({ usuarioId: "No encontramos la cuenta." });
  });

  it("rechaza cualquier otro valor de otorgar", () => {
    for (const otorgar of ["si", "", undefined, true]) {
      expect(esquemaCambiarRol.safeParse({ usuarioId: ID, otorgar }).success).toBe(false);
    }
  });
});
```

- [ ] **Step 2:** `npm test -- cuenta roles` → FAIL (no existen los esquemas).

- [ ] **Step 3: Implementación**

En `src/dominio/cuenta.ts`, debajo de `esquemaPedirEnlace`:

```ts
/** CU-18: correo exacto (normalizado); sin búsqueda parcial (RNF-06). */
export const esquemaBuscarCuenta = z.object({ email });
```

`src/dominio/roles.ts`:

```ts
import { z } from "zod";

/** CU-18, RF-21: el único rol que se otorga o revoca desde la app es administrador_catalogo. */
export const esquemaCambiarRol = z.object({
  usuarioId: z.uuid({ error: "No encontramos la cuenta." }),
  otorgar: z.enum(["1", "0"], { error: "Elegí otorgar o revocar." }).transform((v) => v === "1"),
});
```

- [ ] **Step 4:** `npm test -- cuenta roles` → PASS.
- [ ] **Step 5:** `git commit -m "feat: validación de búsqueda de cuenta y cambio de rol (CU-18)"`

### Task 2: Migración `0005_roles` y capa de datos

**Files:**
- Create: `prisma/migrations/0005_roles/migration.sql`
- Create: `src/datos/roles.ts`
- Test: `tests/integracion/roles.test.ts`
- Modify: `docs/cambios-para-el-informe.md`

**Interfaces:**
- Consumes: `esquemaBuscarCuenta`, `esquemaCambiarRol`, `erroresDe` (Task 1); `conUsuario`, `ClaimsUsuario`; `Resultado<T>` de `src/datos/vehiculos.ts`.
- Produces: `type Cuenta = { id: string; email: string; roles: string[] }`; `buscarCuenta(claims, entrada: { email: unknown }): Promise<Resultado<Cuenta>>`; `cambiarRolCatalogo(claims, entrada: { usuarioId: unknown; otorgar: unknown }): Promise<Resultado<string[]>>` (roles resultantes, ordenados). Si quien llama no es técnico, ambas **lanzan** (la página ya da 404; esto es la defensa de la base).

- [ ] **Step 1: Pruebas de integración que fallan** — `tests/integracion/roles.test.ts`:

```ts
import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { rolesDelUsuario } from "@/datos/cuenta";
import { prismaPrivilegiado } from "@/datos/privilegiado";
import { buscarCuenta, cambiarRolCatalogo } from "@/datos/roles";
import { asignarRol, borrarUsuarioPrueba, claimsDe, crearUsuarioPrueba, sesionDe } from "./ayudantes";

let tecnico: string;
let otro: string;
let correoOtro: string;

beforeAll(async () => {
  tecnico = await crearUsuarioPrueba("roles-t");
  otro = await crearUsuarioPrueba("roles-o");
  await asignarRol(tecnico, 3);
  correoOtro = (await prismaPrivilegiado.usuario.findUniqueOrThrow({ where: { id: otro } })).email;
});

afterAll(async () => {
  await borrarUsuarioPrueba(tecnico);
  await borrarUsuarioPrueba(otro);
});

describe("buscarCuenta (CU-18)", () => {
  it("encuentra por correo exacto, sin distinguir mayúsculas ni espacios", async () => {
    const r = await buscarCuenta(claimsDe(tecnico), { email: `  ${correoOtro.toUpperCase()} ` });
    expect(r).toEqual({ ok: true, valor: { id: otro, email: correoOtro, roles: ["propietario"] } });
  });

  it("sin coincidencia lo informa (1a)", async () => {
    const r = await buscarCuenta(claimsDe(tecnico), { email: "nadie-con-este-correo@example.com" });
    expect(r).toEqual({ ok: false, errores: { email: "No hay ninguna cuenta con ese correo." } });
  });

  it("no hace búsqueda parcial ni interpreta comodines", async () => {
    const [usuario, dominio] = correoOtro.split("@");
    for (const email of [`${usuario.slice(0, -2)}@${dominio}`, `${usuario.slice(0, -2)}%@${dominio}`, `_${usuario.slice(1)}@${dominio}`]) {
      expect((await buscarCuenta(claimsDe(tecnico), { email })).ok).toBe(false);
    }
  });

  it("un correo inválido se rechaza antes de ir a la base", async () => {
    expect(await buscarCuenta(claimsDe(tecnico), { email: "otro@" })).toEqual({
      ok: false,
      errores: { email: "Ingresá un correo electrónico válido." },
    });
  });

  it("quien no es técnico no puede buscar (lo rechaza la base)", async () => {
    await expect(buscarCuenta(claimsDe(otro), { email: correoOtro })).rejects.toThrow(/administrador técnico/);
  });
});

describe("cambiarRolCatalogo (CU-18, RF-21)", () => {
  it("otorga el rol y rige en el pedido siguiente (RNF-05)", async () => {
    const r = await cambiarRolCatalogo(claimsDe(tecnico), { usuarioId: otro, otorgar: "1" });
    expect(r).toEqual({ ok: true, valor: ["administrador_catalogo", "propietario"] });
    expect(await rolesDelUsuario(claimsDe(otro))).toEqual(["administrador_catalogo", "propietario"]);
  });

  it("otorgar dos veces no duplica ni falla", async () => {
    const r = await cambiarRolCatalogo(claimsDe(tecnico), { usuarioId: otro, otorgar: "1" });
    expect(r).toEqual({ ok: true, valor: ["administrador_catalogo", "propietario"] });
    expect(await prismaPrivilegiado.usuarioRol.count({ where: { usuarioId: otro } })).toBe(2);
  });

  it("revoca solo el rol de catálogo; revocar de nuevo no falla", async () => {
    for (let i = 0; i < 2; i++) {
      const r = await cambiarRolCatalogo(claimsDe(tecnico), { usuarioId: otro, otorgar: "0" });
      expect(r).toEqual({ ok: true, valor: ["propietario"] });
    }
  });

  it("no toca los roles del técnico al revocarse a sí mismo el de catálogo", async () => {
    const r = await cambiarRolCatalogo(claimsDe(tecnico), { usuarioId: tecnico, otorgar: "0" });
    expect(r).toEqual({ ok: true, valor: ["administrador_tecnico", "propietario"] });
  });

  it("cuenta inexistente o id mal formado → no encontrada", async () => {
    const esperado = { ok: false, errores: { usuarioId: "No encontramos la cuenta." } };
    expect(await cambiarRolCatalogo(claimsDe(tecnico), { usuarioId: "0f8fad5b-d9cb-469f-a165-70867728950e", otorgar: "1" })).toEqual(esperado);
    expect(await cambiarRolCatalogo(claimsDe(tecnico), { usuarioId: "x", otorgar: "1" })).toEqual(esperado);
  });

  it("quien no es técnico no puede cambiar roles, ni el suyo", async () => {
    await expect(cambiarRolCatalogo(claimsDe(otro), { usuarioId: otro, otorgar: "1" })).rejects.toThrow(/administrador técnico/);
    expect(await rolesDelUsuario(claimsDe(otro))).toEqual(["propietario"]);
  });
});

describe("funciones expuestas por la API REST de Supabase", () => {
  it("sin sesión no se pueden ejecutar", async () => {
    const anonimo = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: false },
    });
    const { data, error } = await anonimo.rpc("buscar_cuenta", { correo: correoOtro });
    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });

  it("un propietario con sesión tampoco", async () => {
    const sesion = await sesionDe(otro);
    expect((await sesion.rpc("buscar_cuenta", { correo: correoOtro })).error).not.toBeNull();
    expect((await sesion.rpc("cambiar_rol_catalogo", { usuario: otro, otorgar: true })).error).not.toBeNull();
    expect(await rolesDelUsuario(claimsDe(otro))).toEqual(["propietario"]);
  });
});
```

- [ ] **Step 2:** `npm run test:integracion -- roles` → FAIL (no existe `@/datos/roles`).

- [ ] **Step 3: Migración** — `prisma/migrations/0005_roles/migration.sql`:

```sql
-- Iteración 3, plan 3C (spec, apartado 5): asignación de roles (CU-18, RF-21).
-- Sin política de lectura sobre usuario: el técnico podría listar todas las cuentas (RNF-06).
-- Las funciones verifican primero el rol de quien llama y solo tocan administrador_catalogo.
BEGIN;

CREATE FUNCTION public.buscar_cuenta(correo text)
  RETURNS TABLE (id uuid, email text, roles text[])
  LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
#variable_conflict use_column
BEGIN
  IF NOT public.tiene_rol('administrador_tecnico') THEN
    RAISE EXCEPTION 'Solo el administrador técnico puede buscar cuentas.' USING ERRCODE = '42501';
  END IF;
  -- Igualdad exacta (no LIKE): sin búsqueda parcial ni comodines.
  RETURN QUERY
    SELECT u.id, u.email::text,
           coalesce(array_agg(r.nombre::text ORDER BY r.nombre) FILTER (WHERE r.nombre IS NOT NULL), '{}')
    FROM public.usuario u
    LEFT JOIN public.usuario_rol ur ON ur.usuario_id = u.id
    LEFT JOIN public.rol r ON r.id = ur.rol_id
    WHERE lower(u.email) = lower(btrim(correo))
    GROUP BY u.id, u.email;
END;
$$;

-- Devuelve los roles resultantes, o NULL si la cuenta no existe.
CREATE FUNCTION public.cambiar_rol_catalogo(usuario uuid, otorgar boolean)
  RETURNS text[]
  LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  rol_catalogo smallint;
  resultado text[];
BEGIN
  IF NOT public.tiene_rol('administrador_tecnico') THEN
    RAISE EXCEPTION 'Solo el administrador técnico puede cambiar roles.' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.usuario u WHERE u.id = usuario) THEN
    RETURN NULL;
  END IF;
  SELECT r.id INTO rol_catalogo FROM public.rol r WHERE r.nombre = 'administrador_catalogo';
  IF otorgar THEN
    INSERT INTO public.usuario_rol (usuario_id, rol_id, fecha_asignacion)
    VALUES (usuario, rol_catalogo, now())
    ON CONFLICT (usuario_id, rol_id) DO NOTHING;
  ELSE
    DELETE FROM public.usuario_rol ur WHERE ur.usuario_id = usuario AND ur.rol_id = rol_catalogo;
  END IF;
  SELECT coalesce(array_agg(r.nombre::text ORDER BY r.nombre), '{}') INTO resultado
  FROM public.usuario_rol ur JOIN public.rol r ON r.id = ur.rol_id
  WHERE ur.usuario_id = usuario;
  RETURN resultado;
END;
$$;

-- Supabase da EXECUTE a anon por defecto en las funciones nuevas de public: se quita.
REVOKE EXECUTE ON FUNCTION public.buscar_cuenta(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.cambiar_rol_catalogo(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.buscar_cuenta(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cambiar_rol_catalogo(uuid, boolean) TO authenticated;

COMMIT;
```

Aplicar en dev: `npx prisma migrate deploy` (desde una red que no bloquee 5432; si no, la aplica el job `integracion` del CI).

- [ ] **Step 4: Datos** — `src/datos/roles.ts`:

```ts
import { erroresDe, esquemaBuscarCuenta } from "@/dominio/cuenta";
import { esquemaCambiarRol } from "@/dominio/roles";
import { conUsuario, type ClaimsUsuario } from "./cliente-usuario";
import type { Resultado } from "./vehiculos";

export type Cuenta = { id: string; email: string; roles: string[] };

/** CU-18 pasos 1-2: correo exacto. La función SQL rechaza a quien no es administrador técnico. */
export async function buscarCuenta(claims: ClaimsUsuario, entrada: { email: unknown }): Promise<Resultado<Cuenta>> {
  const v = esquemaBuscarCuenta.safeParse(entrada);
  if (!v.success) return { ok: false, errores: erroresDe(v.error) };
  const filas = await conUsuario(
    claims,
    (tx) => tx.$queryRaw<Cuenta[]>`SELECT id::text AS id, email, roles FROM public.buscar_cuenta(${v.data.email})`,
  );
  const cuenta = filas[0];
  return cuenta ? { ok: true, valor: cuenta } : { ok: false, errores: { email: "No hay ninguna cuenta con ese correo." } };
}

/** CU-18 pasos 3-4, RF-21: otorga o revoca solo administrador_catalogo; devuelve los roles que quedaron. */
export async function cambiarRolCatalogo(
  claims: ClaimsUsuario,
  entrada: { usuarioId: unknown; otorgar: unknown },
): Promise<Resultado<string[]>> {
  const v = esquemaCambiarRol.safeParse(entrada);
  if (!v.success) return { ok: false, errores: erroresDe(v.error) };
  const [fila] = await conUsuario(
    claims,
    (tx) => tx.$queryRaw<{ roles: string[] | null }[]>`
      SELECT public.cambiar_rol_catalogo(${v.data.usuarioId}::uuid, ${v.data.otorgar}) AS roles`,
  );
  return fila?.roles ? { ok: true, valor: fila.roles } : { ok: false, errores: { usuarioId: "No encontramos la cuenta." } };
}
```

- [ ] **Step 5:** `npx prisma migrate deploy && npm run test:integracion -- roles` → PASS. Si el `rejects.toThrow(/administrador técnico/)` no ve el mensaje de PostgreSQL por cómo lo envuelve el adaptador, ajustar la aserción a lo que muestre el error real (no al revés).

- [ ] **Step 6: Informe** — agregar a `docs/cambios-para-el-informe.md` una sección "Iteración 3 (roles)" con la fila: CU-18, paso 4 | el cambio se aplica al renovar el token (≤ 60 min, RNF-05) | rige en el pedido siguiente, porque la app lee los roles de la base en cada pedido | "El cambio se aplica en el siguiente pedido del usuario afectado".

- [ ] **Step 7:** `npm run lint && npm run typecheck && npm test` → verde. `git commit -m "feat: buscar cuenta y cambiar el rol de catálogo con funciones SQL (CU-18, RF-21)"`

### Task 3: Prod, PR y cierre

- [ ] PR `iteracion-3c-roles` → `main` con los tres checks en verde; merge.
- [ ] Después del despliegue, comprobar en prod que existen las dos funciones y que `anon` no las ejecuta (`rpc("buscar_cuenta")` con la clave publicable → error).
- [ ] Actualizar la memoria del proyecto (3C hecho; siguen 3D y 3E).
