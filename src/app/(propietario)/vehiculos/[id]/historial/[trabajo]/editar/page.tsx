import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { intervencionDelVehiculo } from "@/datos/intervenciones";
import { exigirClaims } from "@/datos/sesion";
import { fechaDeHoy } from "@/dominio/fechas";
import { formatearKm } from "@/dominio/kilometraje";
import { costoParaCampo, fechaParaCampo } from "@/dominio/vista-trabajo";
import { guardarTrabajo } from "../../../trabajos/acciones";
import { BarraTrabajo } from "../../../trabajos/barra";
import { FormularioTrabajo } from "../../../trabajos/formulario-trabajo";

export const metadata: Metadata = { title: "Editar trabajo" };

/** Pantalla 15 en modo edición (CU-12): solo los trabajos registrados. */
export default async function EditarTrabajoPagina({ params }: PageProps<"/vehiculos/[id]/historial/[trabajo]/editar">) {
  const { id, trabajo } = await params;
  const claims = await exigirClaims();
  const t = await intervencionDelVehiculo(claims, id, trabajo);
  if (!t || !t.editable) notFound();

  return (
    <section>
      <BarraTrabajo volver={`/vehiculos/${id}/historial/${trabajo}`} titulo={t.descripcion} />
      <FormularioTrabajo
        accion={guardarTrabajo.bind(null, id, trabajo)}
        usuarioId={claims.sub}
        hoy={fechaParaCampo(fechaDeHoy())}
        inicial={{
          fecha: fechaParaCampo(t.fecha),
          km: formatearKm(t.km),
          taller: t.taller ?? "",
          costo: costoParaCampo(t.costo),
          comprobanteGuardado: t.tieneComprobante,
        }}
        textoBoton="Guardar cambios"
      />
    </section>
  );
}
