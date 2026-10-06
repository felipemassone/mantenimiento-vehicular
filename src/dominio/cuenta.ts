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
  const letras =
    partes.length >= 2 ? partes[0]![0]! + partes[1]![0]! : usuario.replace(/[^a-z]/gi, "").slice(0, 2);
  return letras.toUpperCase();
}

/** Solo rutas internas: evita usar el parámetro `next` para redirigir a otro sitio. */
export function rutaSegura(next: string | null, porDefecto: string): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return porDefecto;
  return next;
}
