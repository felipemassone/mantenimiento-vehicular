"use client";

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
import { borrarVehiculo } from "../acciones";

/** CU-07 1a. */
export function EliminarVehiculo({ id, nombre }: { id: string; nombre: string }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" className="h-12 w-full text-destructive">
          Eliminar vehículo
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100%-2rem)] rounded-[14px] sm:max-w-md">
        <DialogHeader className="text-left">
          <DialogTitle>¿Eliminar el {nombre}?</DialogTitle>
          <DialogDescription>
            Se van a borrar también sus lecturas de kilometraje y su historial. No se puede deshacer.
          </DialogDescription>
        </DialogHeader>
        <form action={borrarVehiculo.bind(null, id)}>
          <DialogFooter className="flex-row gap-2 sm:justify-stretch">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="h-12 flex-1">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" variant="destructive" className="h-12 flex-1">
              Eliminar vehículo
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
