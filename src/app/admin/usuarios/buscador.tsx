"use client";

import { useActionState } from "react";
import { Aviso } from "@/components/aviso";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { nombreDeRol } from "@/dominio/roles";
import { cn } from "@/lib/utils";
import { gestionarUsuario, type EstadoUsuarios } from "./acciones";

/** Pantalla 18: búsqueda por correo exacto (sin listados, RNF-06) y el rol de catálogo. */
export function Buscador() {
  const [estado, enviar, enviando] = useActionState<EstadoUsuarios, FormData>(gestionarUsuario, {});
  const error = estado.errores?.email ?? estado.errores?.usuarioId ?? estado.errores?.otorgar;
  const c = estado.cuenta;
  const esCatalogo = c?.roles.includes("administrador_catalogo") ?? false;

  return (
    <>
      <form action={enviar} className="space-y-1.5" noValidate>
        <input type="hidden" name="operacion" value="buscar" />
        <Label htmlFor="email" className="text-sm font-medium">
          Correo electrónico
        </Label>
        <div className="flex gap-3">
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="off"
            defaultValue={estado.email}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "email-error" : undefined}
            className={cn("h-12 flex-1 bg-card text-base", error && "border-destructive")}
          />
          <Button type="submit" className="h-12 px-6" disabled={enviando}>
            Buscar
          </Button>
        </div>
        {error && (
          <p id="email-error" className="text-[13px] text-destructive">
            {error}
          </p>
        )}
      </form>

      {c && (
        <div className="mt-6 rounded-[14px] border border-border bg-card p-5 md:p-7">
          <h2 className="break-all border-b border-border pb-4 text-[22px] font-semibold">{c.email}</h2>
          <p className="mt-4 text-sm font-medium">Roles</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {c.roles.map((r) => (
              <li key={r} className="rounded-full bg-muted px-3 py-1 text-sm">
                {nombreDeRol(r)}
              </li>
            ))}
          </ul>
          {estado.mensaje && (
            <div className="mt-4">
              <Aviso tipo="exito">{estado.mensaje}</Aviso>
            </div>
          )}
          <form action={enviar} className="mt-4">
            <input type="hidden" name="operacion" value="cambiar" />
            <input type="hidden" name="email" value={c.email} />
            <input type="hidden" name="usuarioId" value={c.id} />
            <input type="hidden" name="otorgar" value={esCatalogo ? "0" : "1"} />
            <Button
              type="submit"
              variant="outline"
              className={cn("h-12 px-5", esCatalogo && "text-destructive hover:text-destructive")}
              disabled={enviando}
            >
              {esCatalogo ? "Quitar administrador de catálogo" : "Dar administrador de catálogo"}
            </Button>
            <p className="mt-1.5 text-[13px] text-muted-foreground">
              El cambio se aplica en la próxima pantalla que abra el usuario.
            </p>
          </form>
        </div>
      )}
    </>
  );
}
