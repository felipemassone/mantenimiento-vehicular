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

/** Mockup 13: una fila abierta a la vez. */
export function ListaSupuestos({
  vehiculoId,
  filas,
  abierta: inicial,
}: {
  vehiculoId: string;
  filas: FilaSupuesto[];
  abierta: number | null;
}) {
  const [abierta, setAbierta] = useState(inicial);
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-[14px] border border-border bg-card">
      {filas.map((f) => (
        <li key={f.itemId}>
          {abierta === f.itemId ? (
            <FilaAbierta vehiculoId={vehiculoId} fila={f} onCerrar={() => setAbierta(null)} />
          ) : (
            <button
              type="button"
              aria-expanded={false}
              onClick={() => setAbierta(f.itemId)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted"
            >
              <Encabezado fila={f} />
              <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </button>
          )}
        </li>
      ))}
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

function FilaAbierta({ vehiculoId, fila, onCerrar }: { vehiculoId: string; fila: FilaSupuesto; onCerrar: () => void }) {
  const [modo, setModo] = useState<"confirmar" | "corregir">("confirmar");
  const [estado, enviar, enviando] = useActionState(
    (previo: EstadoRespuesta, datos: FormData) => responderSupuesto(vehiculoId, fila.itemId, previo, datos),
    {},
  );
  const e = estado.errores;
  const enlace = "text-sm font-medium text-primary underline-offset-4 hover:underline";

  return (
    <div className="px-4 py-3">
      <button
        type="button"
        aria-expanded={true}
        onClick={onCerrar}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <Encabezado fila={fila} />
        <ChevronUp className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </button>
      <form action={enviar} className="mt-3 space-y-4 border-t border-border pt-3">
        {e?.formulario && <Aviso tipo="error">{e.formulario}</Aviso>}
        {modo === "corregir" && (
          <Campo
            id={`km-${fila.itemId}`}
            etiqueta="Kilometraje"
            nombre="km"
            inputMode="numeric"
            sufijo="km"
            valorInicial={estado.valores?.km}
            error={e?.km}
          />
        )}
        <Campo
          id={`fecha-${fila.itemId}`}
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
    </div>
  );
}
