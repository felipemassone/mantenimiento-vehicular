"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Aviso } from "@/components/aviso";
import { CampoContrasena } from "@/components/campo-contrasena";
import { Button } from "@/components/ui/button";
import { guardarContrasena, type EstadoFormulario } from "../../acciones";

export function FormularioNuevaContrasena() {
  const [estado, enviar, enviando] = useActionState<EstadoFormulario, FormData>(guardarContrasena, {});

  return (
    <section>
      <h1 className="text-[22px] font-semibold">Elegí una contraseña nueva</h1>
      <form action={enviar} className="mt-6 space-y-4" noValidate>
        {estado.mensaje && <Aviso tipo="error">{estado.mensaje}</Aviso>}
        <CampoContrasena
          id="contrasena"
          etiqueta="Contraseña nueva"
          nombre="contrasena"
          autoComplete="new-password"
          ayuda="Mínimo 8 caracteres."
          error={estado.errores?.contrasena}
        />
        <CampoContrasena
          id="repetida"
          etiqueta="Repetí la contraseña"
          nombre="repetida"
          autoComplete="new-password"
          error={estado.errores?.repetida}
        />
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
