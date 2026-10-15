"use client";

import { ImageIcon, Paperclip } from "lucide-react";
import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import { Aviso } from "@/components/aviso";
import { Campo } from "@/components/campo";
import { Selector } from "@/components/selector";
import { Button } from "@/components/ui/button";
import { validarArchivo } from "@/dominio/comprobante";
import { formatearTamano } from "@/dominio/vista-trabajo";
import { subirComprobante } from "@/lib/comprobantes";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { EstadoTrabajo } from "./acciones";

type Inicial = { fecha: string; km: string; taller: string; costo: string; comprobanteGuardado: boolean };

type Props = {
  accion: (previo: EstadoTrabajo, datos: FormData) => Promise<EstadoTrabajo>;
  usuarioId: string;
  /** aaaa-mm-dd, día de Argentina: tope del campo fecha. */
  hoy: string;
  /** Registrar: ítems del plan publicado (vacío si el vehículo no tiene plan). */
  items?: { id: number; nombre: string }[];
  /** Registrar: el ítem ya elegido al llegar desde su fila en la ficha. */
  itemInicial?: number;
  /** Editar: los datos guardados; sin tipo, ítem ni descripción (CU-12). */
  inicial?: Inicial;
  textoBoton: string;
};

const valoresDe = (datos: FormData) =>
  Object.fromEntries([...datos].filter((e): e is [string, string] => typeof e[1] === "string"));

/** Pantalla 15: registrar (CU-10) y editar (CU-12) un trabajo, con su comprobante (CU-11). */
export function FormularioTrabajo({ accion, usuarioId, hoy, items, itemInicial, inicial, textoBoton }: Props) {
  const registrar = inicial === undefined;
  const conPlan = registrar && (items?.length ?? 0) > 0;
  const [tipo, setTipo] = useState<"catalogo" | "libre">(conPlan ? "catalogo" : "libre");
  const [item, setItem] = useState(itemInicial === undefined ? "" : String(itemInicial));
  const [archivo, setArchivo] = useState<File | null>(null);
  const [vista, setVista] = useState<string | null>(null);
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null);
  const [quitar, setQuitar] = useState(false);
  // Oculta el error del servidor sobre el comprobante hasta el próximo envío, si se eligió otro archivo.
  const [archivoNuevo, setArchivoNuevo] = useState(false);
  const selectorArchivo = useRef<HTMLInputElement>(null);

  const [estado, enviar, enviando] = useActionState(async (previo: EstadoTrabajo, datos: FormData) => {
    setErrorArchivo(null);
    setArchivoNuevo(false);
    // CU-11: la imagen va directo del navegador a Storage; al servidor solo llega la ruta.
    if (archivo) {
      const s = await subirComprobante(createClient(), usuarioId, archivo);
      if (!s.ok) return { errores: { comprobante: s.error }, valores: valoresDe(datos) };
      datos.set("comprobante", s.ruta);
    }
    return accion(previo, datos);
  }, {});

  useEffect(() => () => void (vista && URL.revokeObjectURL(vista)), [vista]);

  /** Sin `action={...}`: React 19 reiniciaría el formulario y el selector controlado quedaría en blanco. */
  function enviarFormulario(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const datos = new FormData(ev.currentTarget);
    startTransition(() => enviar(datos));
  }

  /** Vacía el input: así se puede volver a elegir el mismo archivo. */
  const vaciarSelector = () => {
    if (selectorArchivo.current) selectorArchivo.current.value = "";
  };

  function elegir(f: File | undefined) {
    vaciarSelector();
    if (!f) return;
    setArchivoNuevo(true);
    const v = validarArchivo({ tipo: f.type, tamano: f.size });
    if (!v.ok) {
      setErrorArchivo(v.error); // CU-11 2a: aviso inmediato, no se sube nada
      return;
    }
    setErrorArchivo(null);
    setArchivo(f);
    setVista(URL.createObjectURL(f));
  }

  function sacarArchivo() {
    vaciarSelector();
    setArchivo(null);
    setVista(null);
  }

  const e = estado.errores ?? {};
  const val = (campo: "fecha" | "km" | "taller" | "costo") => estado.valores?.[campo] ?? inicial?.[campo];
  const errorComprobante = errorArchivo ?? (archivoNuevo ? undefined : e.comprobante);
  const guardado = !registrar && inicial.comprobanteGuardado && !quitar;

  return (
    <form onSubmit={enviarFormulario} className="space-y-4" noValidate>
      {e.formulario && <Aviso tipo="error">{e.formulario}</Aviso>}
      {e.tipo && <Aviso tipo="error">{e.tipo}</Aviso>}

      {registrar && <input type="hidden" name="tipo" value={tipo} />}
      {conPlan && (
        <div className="grid grid-cols-2 gap-1 rounded-[10px] bg-muted p-1" role="group" aria-label="Tipo de trabajo">
          {(
            [
              ["catalogo", "Del plan"],
              ["libre", "Otro trabajo"],
            ] as const
          ).map(([valor, texto]) => (
            <button
              key={valor}
              type="button"
              aria-pressed={tipo === valor}
              onClick={() => setTipo(valor)}
              className={cn(
                "h-10 rounded-[8px] text-sm font-medium transition-colors",
                tipo === valor ? "bg-card text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {texto}
            </button>
          ))}
        </div>
      )}
      {registrar &&
        (tipo === "catalogo" ? (
          <Selector
            id="itemId"
            etiqueta="Trabajo"
            nombre="itemId"
            valor={item || estado.valores?.itemId || ""}
            onCambio={setItem}
            opciones={(items ?? []).map((i) => ({ valor: String(i.id), texto: i.nombre }))}
            vacio="Elegí el trabajo"
            error={e.itemId}
          />
        ) : (
          <Campo
            id="descripcion"
            etiqueta="Descripción"
            nombre="descripcion"
            valorInicial={estado.valores?.descripcion}
            error={e.descripcion}
          />
        ))}

      <Campo id="fecha" etiqueta="Fecha" nombre="fecha" tipo="date" max={hoy} valorInicial={val("fecha")} error={e.fecha} />
      <Campo
        id="km"
        etiqueta="Kilometraje"
        nombre="km"
        inputMode="numeric"
        sufijo="km"
        valorInicial={val("km")}
        error={e.km}
      />
      <Campo id="taller" etiqueta="Taller" nombre="taller" opcional valorInicial={val("taller")} error={e.taller} />
      <Campo
        id="costo"
        etiqueta="Costo"
        nombre="costo"
        inputMode="text"
        prefijo="$"
        opcional
        valorInicial={val("costo")}
        error={e.costo}
      />

      <input
        ref={selectorArchivo}
        type="file"
        accept="image/jpeg,image/png"
        aria-label="Comprobante"
        hidden
        onChange={(ev) => elegir(ev.target.files?.[0])}
      />
      {!registrar && <input type="hidden" name="quitarComprobante" value={quitar && !archivo ? "1" : ""} />}
      <div className="space-y-1.5">
        {archivo && vista ? (
          <>
            <p className="text-sm font-medium">Comprobante</p>
            <div className="flex items-center gap-3 rounded-[10px] border border-border bg-card p-2 pr-4">
              {/* eslint-disable-next-line @next/next/no-img-element -- vista previa local (blob:) */}
              <img src={vista} alt="" className="size-12 shrink-0 rounded-[6px] object-cover" />
              <p className="min-w-0 flex-1 truncate text-sm">
                {archivo.name} <span className="text-muted-foreground">· {formatearTamano(archivo.size)}</span>
              </p>
              <button type="button" onClick={sacarArchivo} className="text-sm font-medium text-primary underline underline-offset-4">
                Quitar
              </button>
            </div>
          </>
        ) : guardado ? (
          <>
            <p className="text-sm font-medium">Comprobante</p>
            <div className="flex items-center gap-3 rounded-[10px] border border-border bg-card p-2 pr-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-[6px] bg-muted">
                <ImageIcon className="size-5 text-muted-foreground" aria-hidden="true" />
              </span>
              <p className="min-w-0 flex-1 text-sm">Imagen guardada</p>
              <span className="flex shrink-0 gap-4">
                <button
                  type="button"
                  onClick={() => selectorArchivo.current?.click()}
                  className="text-sm font-medium text-primary underline underline-offset-4"
                >
                  Reemplazar
                </button>
                <button
                  type="button"
                  onClick={() => setQuitar(true)}
                  className="text-sm font-medium text-primary underline underline-offset-4"
                >
                  Quitar
                </button>
              </span>
            </div>
          </>
        ) : (
          <>
            <Button
              type="button"
              variant="outline"
              className="h-12 w-full gap-2"
              onClick={() => selectorArchivo.current?.click()}
              aria-describedby="comprobante-ayuda"
            >
              <Paperclip className="size-4" aria-hidden="true" /> Adjuntar comprobante
            </Button>
            {!errorComprobante && (
              <p id="comprobante-ayuda" className="text-center text-[13px] text-muted-foreground">
                JPG o PNG, hasta 5 MB.
              </p>
            )}
          </>
        )}
        {errorComprobante && (
          <p id="comprobante-ayuda" role="alert" className="text-[13px] text-destructive">
            {errorComprobante}
          </p>
        )}
      </div>

      <Button type="submit" className="h-12 w-full" disabled={enviando}>
        {enviando ? "Guardando…" : textoBoton}
      </Button>
    </form>
  );
}
