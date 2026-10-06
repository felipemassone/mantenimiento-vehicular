"use client";

import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { Aviso } from "@/components/aviso";
import { Campo } from "@/components/campo";
import { Button } from "@/components/ui/button";
import { ingresar, reenviarConfirmacion, type EstadoFormulario } from "../acciones";

type Props = { enlaceInvalido: boolean; cuentaEliminada: boolean };

export function FormularioIngresar({ enlaceInvalido, cuentaEliminada }: Props) {
  const [estado, enviar, enviando] = useActionState<EstadoFormulario, FormData>(ingresar, {});
  const [reenvio, reenviar, reenviando] = useActionState<EstadoFormulario, FormData>(reenviarConfirmacion, {});
  const [ver, setVer] = useState(false);

  return (
    <section>
      <h1 className="text-[22px] font-semibold">Ingresar</h1>
      <div className="mt-4 space-y-3">
        {cuentaEliminada && <Aviso tipo="exito">Tu cuenta y todos sus datos se eliminaron.</Aviso>}
        {enlaceInvalido && (
          <Aviso tipo="advertencia">El enlace ya fue usado o venció. Ingresá con tu contraseña o pedí uno nuevo.</Aviso>
        )}
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
        <Campo
          id="email"
          etiqueta="Correo electrónico"
          nombre="email"
          tipo="email"
          autoComplete="email"
          inputMode="email"
          error={estado.errores?.email}
        />
        <div className="relative">
          <Campo
            id="contrasena"
            etiqueta="Contraseña"
            nombre="contrasena"
            tipo={ver ? "text" : "password"}
            autoComplete="current-password"
            error={estado.errores?.contrasena}
          />
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
