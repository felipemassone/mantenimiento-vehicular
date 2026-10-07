"use client";

import { useActionState, useState } from "react";
import { Campo } from "@/components/campo";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { actualizarKilometraje, type EstadoVehiculo } from "../acciones";

/** CU-08: muestra la última lectura y registra la nueva. */
export function ActualizarKilometraje({ id, ultima }: { id: string; ultima: string }) {
  const [abierto, setAbierto] = useState(false);
  const [estado, enviar, enviando] = useActionState(async (previo: EstadoVehiculo, datos: FormData) => {
    const r = await actualizarKilometraje(id, previo, datos);
    if (r.ok) setAbierto(false); // se cierra solo si se guardó
    return r;
  }, {});

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-12 w-full">
          Actualizar kilometraje
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100%-2rem)] rounded-[14px] sm:max-w-md">
        <DialogHeader className="text-left">
          <DialogTitle>Actualizar kilometraje</DialogTitle>
          <DialogDescription>Última lectura: {ultima}.</DialogDescription>
        </DialogHeader>
        <form action={enviar} className="space-y-4">
          <Campo
            id="kilometraje"
            etiqueta="Kilometraje actual"
            nombre="kilometraje"
            inputMode="numeric"
            sufijo="km"
            error={estado.errores?.kilometraje ?? estado.errores?.formulario}
          />
          <Button type="submit" className="h-12 w-full" disabled={enviando}>
            Guardar
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
