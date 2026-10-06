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
            Si existe una cuenta con {estado.enviadoA}, te mandamos un enlace para elegir una contraseña nueva. Sirve
            una sola vez.
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
            <Campo
              id="email"
              etiqueta="Correo electrónico"
              nombre="email"
              tipo="email"
              autoComplete="email"
              inputMode="email"
              error={estado.errores?.email}
            />
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
