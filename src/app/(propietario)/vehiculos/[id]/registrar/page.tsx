import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { estadoDelVehiculo } from "@/datos/estado";
import { exigirClaims } from "@/datos/sesion";
import { obtenerVehiculo } from "@/datos/vehiculos";
import { fechaDeHoy } from "@/dominio/fechas";
import { fechaParaCampo } from "@/dominio/vista-trabajo";
import { guardarTrabajo } from "../trabajos/acciones";
import { BarraTrabajo } from "../trabajos/barra";
import { FormularioTrabajo } from "../trabajos/formulario-trabajo";

export const metadata: Metadata = { title: "Registrar trabajo" };

/** Pantalla 15 (CU-10). */
export default async function RegistrarTrabajoPagina({ params, searchParams }: PageProps<"/vehiculos/[id]/registrar">) {
  const { id } = await params;
  const { item } = await searchParams;
  const claims = await exigirClaims();
  const [v, estado] = await Promise.all([obtenerVehiculo(claims, id), estadoDelVehiculo(claims, id)]);
  if (!v) notFound();
  // RF-13: los ítems del plan publicado del modelo; sin plan, solo "Otro trabajo" (RF-14).
  const items = (estado?.catalogado ? estado.items : [])
    .map((i) => ({ id: i.itemId, nombre: i.nombre }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  // Desde una fila de la ficha llega `?item=`: solo se usa si es un ítem del plan.
  const elegido = items.find((i) => String(i.id) === item)?.id;

  return (
    <section>
      <BarraTrabajo volver={`/vehiculos/${id}`} titulo="Registrar trabajo" />
      <FormularioTrabajo
        accion={guardarTrabajo.bind(null, id, null)}
        usuarioId={claims.sub}
        hoy={fechaParaCampo(fechaDeHoy())}
        items={items}
        itemInicial={elegido}
        textoBoton="Guardar trabajo"
      />
    </section>
  );
}
