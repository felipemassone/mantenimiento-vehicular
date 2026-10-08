"use client";

import { useActionState, useState } from "react";
import { Aviso } from "@/components/aviso";
import { Campo } from "@/components/campo";
import { Selector } from "@/components/selector";
import { Button } from "@/components/ui/button";
import type { DatosModelo } from "@/dominio/catalogo";
import type { EstadoAdmin } from "../acciones";

const OTRA = "__otra";

type Props = {
  accion: (previo: EstadoAdmin, datos: FormData) => Promise<EstadoAdmin>;
  marcas: string[];
  inicial?: DatosModelo;
  textoBoton: string;
};

/** CU-15: alta y edición de modelo. */
export function FormularioModelo({ accion, marcas, inicial, textoBoton }: Props) {
  const [estado, enviar, enviando] = useActionState(accion, {});
  const [marca, setMarca] = useState(inicial?.marca ?? "");
  const e = estado.errores ?? {};
  return (
    <form action={enviar} className="max-w-[560px] space-y-4" noValidate>
      {e.formulario && <Aviso tipo="error">{e.formulario}</Aviso>}
      <Selector
        id="marca"
        etiqueta="Marca"
        nombre={marca === OTRA ? "" : "marca"}
        valor={marca}
        onCambio={setMarca}
        opciones={[...marcas.map((m) => ({ valor: m, texto: m })), { valor: OTRA, texto: "Otra marca…" }]}
        error={marca === OTRA ? undefined : e.marca}
      />
      {marca === OTRA && <Campo id="marca-nueva" etiqueta="Nueva marca" nombre="marca" error={e.marca} />}
      <Campo id="nombre" etiqueta="Modelo" nombre="nombre" valorInicial={inicial?.nombre} error={e.nombre} />
      <div className="grid grid-cols-2 gap-3">
        <Campo
          id="anioDesde"
          etiqueta="Desde el año"
          nombre="anioDesde"
          inputMode="numeric"
          valorInicial={inicial ? String(inicial.anioDesde) : undefined}
        />
        <Campo
          id="anioHasta"
          etiqueta="Hasta el año"
          nombre="anioHasta"
          inputMode="numeric"
          valorInicial={inicial?.anioHasta ? String(inicial.anioHasta) : undefined}
          error={e.anioHasta}
        />
      </div>
      <p className="text-[13px] text-muted-foreground">Dejá vacío “Hasta” si se sigue fabricando.</p>
      {e.anioDesde && <Aviso tipo="error">{e.anioDesde}</Aviso>}
      <Button type="submit" className="h-12" disabled={enviando}>
        {textoBoton}
      </Button>
      {!inicial && (
        <p className="text-[13px] text-muted-foreground">Al crearlo, el modelo queda con un plan vacío en borrador.</p>
      )}
    </form>
  );
}
