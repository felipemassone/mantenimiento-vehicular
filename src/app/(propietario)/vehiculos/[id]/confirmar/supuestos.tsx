"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useActionState, useMemo, useState } from "react";
import { Aviso } from "@/components/aviso";
import { Campo } from "@/components/campo";
import { ChipEstado } from "@/components/chip-estado";
import { Button } from "@/components/ui/button";
import { aclaracionDelSupuesto, preguntaDelSupuesto, textoNoLoSe, vistaPrevia } from "@/dominio/confirmacion";
import { leerEnteroConMiles } from "@/dominio/kilometraje";
import type { ItemDelPlan } from "@/dominio/motor";
import { leerFecha } from "@/dominio/supuestos";
import { responderSupuesto, type EstadoRespuesta } from "./acciones";

export type FilaSupuesto = {
  itemId: number;
  nombre: string;
  km: string; // ya formateado: "60.000"
  kmSupuesto: number;
  origen: "supuesta_pendiente" | "supuesta_a_verificar";
  item: ItemDelPlan;
};

/** Lo que la vista previa necesita del vehículo: la lectura actual y el día de hoy (aaaa-mm-dd). */
export type Contexto = { kmActual: number; hoy: string };

/**
 * Mockup 13: una fila abierta a la vez. El encabezado de cada fila es siempre el mismo botón (con
 * aria-expanded), así abrir o cerrar no le quita el foco a quien navega con teclado o lector de pantalla.
 */
export function ListaSupuestos({
  vehiculoId,
  filas,
  abierta: inicial,
  deAlta,
  contexto,
}: {
  vehiculoId: string;
  filas: FilaSupuesto[];
  abierta: number | null;
  deAlta: boolean;
  contexto: Contexto;
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
                <Formulario vehiculoId={vehiculoId} fila={f} deAlta={deAlta} contexto={contexto} />
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

function Formulario({
  vehiculoId,
  fila,
  deAlta,
  contexto,
}: {
  vehiculoId: string;
  fila: FilaSupuesto;
  deAlta: boolean;
  contexto: Contexto;
}) {
  const itemId = fila.itemId;
  const [modo, setModo] = useState<"confirmar" | "corregir">("confirmar");
  const [estado, enviar, enviando] = useActionState(
    (previo: EstadoRespuesta, datos: FormData) => responderSupuesto(vehiculoId, itemId, deAlta, previo, datos),
    {},
  );
  const [fecha, setFecha] = useState(estado.valores?.fecha ?? "");
  const [km, setKm] = useState(estado.valores?.km ?? "");
  const e = estado.errores;
  const enlace = "text-sm font-medium text-primary underline-offset-4 hover:underline";
  const aclaracion = aclaracionDelSupuesto(fila.item.tipo);

  // Spec 2026-10-16, apartado 2: cómo quedaría el ítem, apenas el dato es válido.
  const previa = useMemo(() => {
    const hoy = new Date(`${contexto.hoy}T00:00:00Z`);
    const f = leerFecha(fecha, hoy);
    if (!f.ok) return null;
    const kmUsado = modo === "corregir" ? leerEnteroConMiles(km) : fila.kmSupuesto;
    if (kmUsado === null || kmUsado > contexto.kmActual) return null;
    return vistaPrevia({ item: fila.item, km: kmUsado, fecha: f.fecha, kmActual: contexto.kmActual, hoy });
  }, [fecha, km, modo, fila, contexto]);

  return (
    <form action={enviar} className="space-y-4 border-t border-border pt-3">
      {e?.formulario && <Aviso tipo="error">{e.formulario}</Aviso>}
      {modo === "confirmar" && (
        <div>
          <p className="font-medium">{preguntaDelSupuesto(fila.item.tipo, fila.km)}</p>
          {aclaracion && <p className="text-sm text-muted-foreground">{aclaracion}</p>}
        </div>
      )}
      {modo === "corregir" && (
        <Campo
          id={`km-${itemId}`}
          etiqueta="Kilometraje"
          nombre="km"
          inputMode="numeric"
          sufijo="km"
          valorInicial={estado.valores?.km}
          error={e?.km}
          onCambio={setKm}
        />
      )}
      <Campo
        id={`fecha-${itemId}`}
        etiqueta={modo === "corregir" ? "Fecha" : "¿Cuándo se hizo?"}
        nombre="fecha"
        tipo="date"
        max={contexto.hoy}
        valorInicial={estado.valores?.fecha}
        error={e?.fecha}
        onCambio={setFecha}
      />
      <p aria-live="polite" className="text-sm tabular-nums empty:hidden">
        {previa}
      </p>
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
          <p className="text-center text-[13px] text-muted-foreground">{textoNoLoSe(fila.km)}</p>
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
