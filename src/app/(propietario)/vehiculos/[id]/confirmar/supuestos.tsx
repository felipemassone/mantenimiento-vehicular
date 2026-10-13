"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useActionState, useState } from "react";
import { Aviso } from "@/components/aviso";
import { Campo } from "@/components/campo";
import { ChipEstado } from "@/components/chip-estado";
import { Button } from "@/components/ui/button";
import { responderSupuesto, type EstadoRespuesta } from "./acciones";

export type FilaSupuesto = {
  itemId: number;
  nombre: string;
  km: string; // ya formateado: "60.000"
  origen: "supuesta_pendiente" | "supuesta_a_verificar";
};

/**
 * Mockup 13: una fila abierta a la vez. El encabezado de cada fila es siempre el mismo botón (con
 * aria-expanded), así abrir o cerrar no le quita el foco a quien navega con teclado o lector de pantalla.
 */
export function ListaSupuestos({
  vehiculoId,
  filas,
  abierta: inicial,
  deAlta,
}: {
  vehiculoId: string;
  filas: FilaSupuesto[];
  abierta: number | null;
  deAlta: boolean;
}) {
  const [abierta, setAbierta] = useState(inicial);
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-[14px] border border-border bg-card">
      {filas.map((f) => {
        const esta = abierta === f.itemId;
        const Chevron = esta ? ChevronUp : ChevronDown;
        return (
          <li key={f.itemId}>
            <button
              type="button"
              aria-expanded={esta}
              aria-controls={`supuesto-${f.itemId}`}
              onClick={() => setAbierta(esta ? null : f.itemId)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              <Encabezado fila={f} />
              <Chevron className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </button>
            {esta && (
              <div id={`supuesto-${f.itemId}`} className="px-4 pb-4">
                <Formulario vehiculoId={vehiculoId} itemId={f.itemId} deAlta={deAlta} />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function Encabezado({ fila }: { fila: FilaSupuesto }) {
  return (
    <span className="min-w-0">
      <span className="block font-medium">{fila.nombre}</span>
      <span className="block text-sm text-muted-foreground tabular-nums">Supuesto a los {fila.km} km</span>
      {fila.origen === "supuesta_a_verificar" && (
        <span className="mt-1 inline-block">
          <ChipEstado tipo="verificar_en_taller" texto="Verificar en taller" />
        </span>
      )}
    </span>
  );
}

function Formulario({ vehiculoId, itemId, deAlta }: { vehiculoId: string; itemId: number; deAlta: boolean }) {
  const [modo, setModo] = useState<"confirmar" | "corregir">("confirmar");
  const [estado, enviar, enviando] = useActionState(
    (previo: EstadoRespuesta, datos: FormData) => responderSupuesto(vehiculoId, itemId, deAlta, previo, datos),
    {},
  );
  const e = estado.errores;
  const enlace = "text-sm font-medium text-primary underline-offset-4 hover:underline";

  return (
    <form action={enviar} className="space-y-4 border-t border-border pt-3">
      {e?.formulario && <Aviso tipo="error">{e.formulario}</Aviso>}
      {modo === "corregir" && (
        <Campo
          id={`km-${itemId}`}
          etiqueta="Kilometraje"
          nombre="km"
          inputMode="numeric"
          sufijo="km"
          valorInicial={estado.valores?.km}
          error={e?.km}
        />
      )}
      <Campo
        id={`fecha-${itemId}`}
        etiqueta={modo === "corregir" ? "Fecha" : "¿Cuándo se hizo?"}
        nombre="fecha"
        tipo="date"
        valorInicial={estado.valores?.fecha}
        error={e?.fecha}
      />
      {modo === "confirmar" ? (
        <>
          <Button type="submit" name="respuesta" value="confirmar" className="h-12 w-full" disabled={enviando}>
            Sí, se hizo
          </Button>
          <div className="flex items-center justify-center gap-4">
            <button type="button" className={enlace} onClick={() => setModo("corregir")}>
              Fue en otro momento
            </button>
            <span className="h-4 w-px bg-border" aria-hidden="true" />
            <button type="submit" name="respuesta" value="no_lo_se" className={enlace} disabled={enviando}>
              No lo sé
            </button>
          </div>
        </>
      ) : (
        <div className="flex items-center gap-4">
          <Button type="submit" name="respuesta" value="corregir" className="h-12 flex-1" disabled={enviando}>
            Guardar
          </Button>
          <button type="button" className={enlace} onClick={() => setModo("confirmar")}>
            Cancelar
          </button>
        </div>
      )}
    </form>
  );
}
