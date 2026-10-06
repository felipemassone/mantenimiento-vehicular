"use client";

import { Mail } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { Aviso } from "@/components/aviso";
import { Campo } from "@/components/campo";
import { CampoContrasena } from "@/components/campo-contrasena";
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
          Te mandamos un enlace a <strong className="font-semibold text-foreground">{estado.enviadoA}</strong>. Abrilo
          para activar tu cuenta. Si no lo ves, fijate en la carpeta de correo no deseado.
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
        <Campo
          id="email"
          etiqueta="Correo electrónico"
          nombre="email"
          tipo="email"
          autoComplete="email"
          inputMode="email"
          error={estado.errores?.email}
        />
        <CampoContrasena
          id="contrasena"
          etiqueta="Contraseña"
          nombre="contrasena"
          autoComplete="new-password"
          ayuda="Mínimo 8 caracteres."
          error={estado.errores?.contrasena}
        />
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
