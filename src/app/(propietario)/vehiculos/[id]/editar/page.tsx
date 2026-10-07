import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirClaims } from "@/datos/sesion";
import { catalogoPublicado, obtenerVehiculo } from "@/datos/vehiculos";
import { editarVehiculo } from "../../acciones";
import { FormularioVehiculo } from "../../formulario";

export const metadata: Metadata = { title: "Editar vehículo · Libreta de service" };

export default async function EditarVehiculoPagina({ params }: PageProps<"/vehiculos/[id]/editar">) {
  const { id } = await params;
  const claims = await exigirClaims();
  const [v, catalogo] = await Promise.all([obtenerVehiculo(claims, id), catalogoPublicado(claims)]);
  if (!v) notFound();

  return (
    <section>
      <Link href={`/vehiculos/${v.id}`} className="mb-4 inline-flex items-center gap-1 text-sm">
        <ArrowLeft className="size-4" aria-hidden="true" /> Volver
      </Link>
      <h1 className="text-[22px] font-semibold">Editar vehículo</h1>
      <p className="mb-6 mt-1 text-sm text-muted-foreground">El kilometraje se actualiza desde la ficha.</p>
      <FormularioVehiculo
        catalogo={catalogo}
        accion={editarVehiculo.bind(null, v.id)}
        inicial={{ datos: v.datos, marcaId: v.marcaId }}
        conKilometraje={false}
        textoBoton="Guardar cambios"
      />
    </section>
  );
}
