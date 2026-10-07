"use client";

import { useActionState, useState } from "react";
import { Aviso } from "@/components/aviso";
import { Campo } from "@/components/campo";
import { Selector } from "@/components/selector";
import { Button } from "@/components/ui/button";
import type { MarcaCatalogo } from "@/datos/vehiculos";
import { aniosDelModelo, type DatosVehiculo } from "@/dominio/vehiculo";
import type { EstadoVehiculo } from "./acciones";

type Props = {
  catalogo: MarcaCatalogo[];
  accion: (previo: EstadoVehiculo, datos: FormData) => Promise<EstadoVehiculo>;
  inicial?: { datos: DatosVehiculo; marcaId: number | null };
  conKilometraje: boolean;
  textoBoton: string;
};

/** CU-05 (alta) y CU-07 (edición): catálogo o modelo libre (3a). */
export function FormularioVehiculo({ catalogo, accion, inicial, conKilometraje, textoBoton }: Props) {
  const [estado, enviar, enviando] = useActionState(accion, {});
  const [modo, setModo] = useState<"catalogo" | "libre">(inicial?.datos.tipo ?? "catalogo");
  const [marcaId, setMarcaId] = useState(inicial?.marcaId ? String(inicial.marcaId) : "");
  const [modeloId, setModeloId] = useState(inicial?.datos.tipo === "catalogo" ? String(inicial.datos.modeloId) : "");
  const [anio, setAnio] = useState(inicial?.datos.tipo === "catalogo" ? String(inicial.datos.anio) : "");

  const marca = catalogo.find((m) => String(m.id) === marcaId);
  const modelo = marca?.modelos.find((m) => String(m.id) === modeloId);
  const anios = modelo ? aniosDelModelo(modelo.anioDesde, modelo.anioHasta, new Date().getFullYear()) : [];
  const rango = modelo && (modelo.anioHasta ? `de ${modelo.anioDesde} a ${modelo.anioHasta}` : `desde ${modelo.anioDesde}`);
  const libreInicial = inicial?.datos.tipo === "libre" ? inicial.datos : null;
  const e = estado.errores ?? {};

  return (
    <form action={enviar} className="space-y-4" noValidate>
      <input type="hidden" name="tipo" value={modo} />
      {e.formulario && <Aviso tipo="error">{e.formulario}</Aviso>}

      {modo === "catalogo" ? (
        <>
          <Selector
            id="marca"
            etiqueta="Marca"
            nombre="marcaId"
            valor={marcaId}
            onCambio={(v) => {
              setMarcaId(v);
              setModeloId("");
              setAnio("");
            }}
            opciones={catalogo.map((m) => ({ valor: String(m.id), texto: m.nombre }))}
            vacio="Elegí la marca"
          />
          <Selector
            id="modelo"
            etiqueta="Modelo"
            nombre="modeloId"
            valor={modeloId}
            onCambio={(v) => {
              setModeloId(v);
              setAnio("");
            }}
            opciones={(marca?.modelos ?? []).map((m) => ({ valor: String(m.id), texto: m.nombre }))}
            vacio={marca ? "Elegí el modelo" : "Primero elegí la marca"}
            error={e.modeloId}
          />
          <Selector
            id="anio"
            etiqueta="Año"
            nombre="anio"
            valor={anio}
            onCambio={setAnio}
            opciones={anios.map((a) => ({ valor: String(a), texto: String(a) }))}
            vacio={modelo ? "Elegí el año" : "Primero elegí el modelo"}
            ayuda={rango ? `Este modelo está cargado ${rango}.` : undefined}
            error={e.anio}
          />
          <button
            type="button"
            onClick={() => setModo("libre")}
            className="text-sm text-primary underline underline-offset-4"
          >
            Mi modelo no figura en la lista
          </button>
        </>
      ) : (
        <>
          <Aviso tipo="advertencia">
            Vamos a guardar tu vehículo, pero todavía no tenemos el plan de mantenimiento de este modelo. Vas a poder
            registrar los trabajos que le hagas.
          </Aviso>
          <Campo id="marca-libre" etiqueta="Marca" nombre="marca" valorInicial={libreInicial?.marca} error={e.marca} />
          <Campo
            id="modelo-libre"
            etiqueta="Modelo"
            nombre="modelo"
            valorInicial={libreInicial?.modelo}
            error={e.modelo}
          />
          <Campo
            id="anio-libre"
            etiqueta="Año"
            nombre="anio"
            inputMode="numeric"
            valorInicial={libreInicial ? String(libreInicial.anio) : undefined}
            error={e.anio}
          />
          {catalogo.length > 0 && (
            <button
              type="button"
              onClick={() => setModo("catalogo")}
              className="text-sm text-primary underline underline-offset-4"
            >
              Elegir un modelo de la lista
            </button>
          )}
        </>
      )}

      {conKilometraje && (
        <Campo
          id="kilometraje"
          etiqueta="Kilometraje actual"
          nombre="kilometraje"
          inputMode="numeric"
          sufijo="km"
          error={e.kilometraje}
        />
      )}

      <Button type="submit" className="h-12 w-full" disabled={enviando}>
        {textoBoton}
      </Button>
    </form>
  );
}
