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
import { textoCambios } from "@/dominio/vista-estado";
import { actualizarKilometraje, type EstadoVehiculo } from "../acciones";
import { usePublicarCambios } from "./cambios";

/** CU-08: muestra la última lectura y registra la nueva. */
export function ActualizarKilometraje({ id, ultima }: { id: string; ultima: string }) {
  const [abierto, setAbierto] = useState(false);
  const publicar = usePublicarCambios();
  const [estado, enviar, enviando] = useActionState(async (previo: EstadoVehiculo, datos: FormData) => {
    const r = await actualizarKilometraje(id, previo, datos);
    // CU-08 paso 7: una lectura rechazada o sin cambios borra el aviso anterior.
    const texto = r.ok && r.km !== undefined ? textoCambios(r.km, r.cambios ?? []) : null;
    publicar(texto ? { texto, itemIds: (r.cambios ?? []).map((c) => c.itemId) } : null);
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
