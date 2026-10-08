"use client";

import { useActionState } from "react";
import { Aviso } from "@/components/aviso";
import { Button } from "@/components/ui/button";
import { descartar, publicar, type EstadoAdmin } from "@/app/admin/acciones";

type Props = { modeloId: number; version: number; puedeDescartar: boolean };

/** CU-17 y descartar borrador. */
export function AccionesPlan({ modeloId, version, puedeDescartar }: Props) {
  const [estado, enviar, enviando] = useActionState<EstadoAdmin>(() => publicar(modeloId), {});
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {puedeDescartar && (
          <form action={descartar.bind(null, modeloId)}>
            <Button type="submit" variant="outline" className="h-12">
              Descartar borrador
            </Button>
          </form>
        )}
        <form action={enviar}>
          <Button type="submit" className="h-12" disabled={enviando}>
            Publicar versión {version}
          </Button>
        </form>
      </div>
      {estado.errores?.plan && <Aviso tipo="error">{estado.errores.plan}</Aviso>}
      {estado.mensaje && <Aviso tipo="exito">{estado.mensaje}</Aviso>}
    </div>
  );
}
