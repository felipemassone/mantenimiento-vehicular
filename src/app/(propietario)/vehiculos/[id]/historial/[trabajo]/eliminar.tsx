"use client";

import { useActionState } from "react";
import { Aviso } from "@/components/aviso";
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
import { borrarTrabajo, type EstadoTrabajo } from "../../trabajos/acciones";

/** Pantalla 17, estado 2 (CU-12 1a). */
export function EliminarTrabajo({ vehiculoId, trabajoId }: { vehiculoId: string; trabajoId: string }) {
  const [estado, enviar, enviando] = useActionState<EstadoTrabajo>(() => borrarTrabajo(vehiculoId, trabajoId), {});
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-12 w-full text-destructive hover:text-destructive">
          Eliminar trabajo
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100%-2rem)] rounded-[14px] sm:max-w-md">
        <DialogHeader className="text-left">
          <DialogTitle>¿Eliminar este trabajo?</DialogTitle>
          <DialogDescription>
            Se borra del historial junto con su comprobante, y el plan vuelve a contar desde el trabajo anterior. No se
            puede deshacer.
          </DialogDescription>
        </DialogHeader>
        {estado.errores?.formulario && <Aviso tipo="error">{estado.errores.formulario}</Aviso>}
        <form action={enviar}>
          <DialogFooter className="flex-row gap-2 sm:justify-stretch">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="h-12 flex-1">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" variant="destructive" className="h-12 flex-1" disabled={enviando}>
              Eliminar trabajo
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
