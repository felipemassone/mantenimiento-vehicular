"use client";

import { useActionState, useState } from "react";
import { Campo } from "@/components/campo";
import { Selector } from "@/components/selector";
import { Button } from "@/components/ui/button";
import { sumarItem, type EstadoAdmin } from "@/app/admin/acciones";

/** CU-16 paso 3. */
export function AgregarItem({ modeloId }: { modeloId: number }) {
  const [abierto, setAbierto] = useState(false);
  const [tipo, setTipo] = useState("");
  const [estado, enviar, enviando] = useActionState(async (previo: EstadoAdmin, datos: FormData) => {
    const r = await sumarItem(modeloId, previo, datos);
    if (r.ok) {
      setAbierto(false);
      setTipo("");
    }
    return r;
  }, {});
  const e = estado.errores ?? {};

  if (!abierto) {
    return (
      <Button type="button" variant="outline" className="h-12" onClick={() => setAbierto(true)}>
        Agregar ítem
      </Button>
    );
  }
  return (
    <form action={enviar} className="max-w-[560px] space-y-4 rounded-[14px] border border-border bg-card p-4" noValidate>
      <Campo id="item-nombre" etiqueta="Ítem" nombre="nombre" error={e.nombre} />
      <Selector
        id="item-tipo"
        etiqueta="Tipo"
        nombre="tipo"
        valor={tipo}
        onCambio={setTipo}
        opciones={[
          { valor: "reemplazo", texto: "Cambiar (reemplazo)" },
          { valor: "inspeccion", texto: "Revisar (inspección)" },
        ]}
        error={e.tipo}
      />
      <div className="grid grid-cols-2 gap-3">
        <Campo id="item-km" etiqueta="Cada (km)" nombre="km" inputMode="numeric" error={e.km} />
        <Campo
          id="item-meses"
          etiqueta="Cada (meses)"
          nombre="meses"
          inputMode="numeric"
          ayuda="Solo si el fabricante lo indica."
          error={e.meses}
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" className="h-12" disabled={enviando}>
          Agregar al plan
        </Button>
        <Button type="button" variant="outline" className="h-12" onClick={() => setAbierto(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
