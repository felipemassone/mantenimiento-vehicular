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
        <button type="button" className="flex h-12 w-full items-center px-4 text-left text-destructive transition-colors hover:bg-destructive/5">
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
          <Campo
            id="contrasena-eliminar"
            etiqueta="Ingresá tu contraseña para confirmar"
            nombre="contrasena"
            tipo="password"
            autoComplete="current-password"
            error={estado.error}
          />
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
