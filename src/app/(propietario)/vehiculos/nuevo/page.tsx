import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { exigirClaims } from "@/datos/sesion";
import { catalogoPublicado } from "@/datos/vehiculos";
import { agregarVehiculo } from "../acciones";
import { FormularioVehiculo } from "../formulario";

export const metadata: Metadata = { title: "Agregar vehículo · Libreta de service" };

export default async function NuevoVehiculoPagina() {
  const claims = await exigirClaims();
  const catalogo = await catalogoPublicado(claims);
  return (
    <section>
      <Link href="/vehiculos" className="mb-4 inline-flex items-center gap-1 text-sm">
        <ArrowLeft className="size-4" aria-hidden="true" /> Volver
      </Link>
      <h1 className="mb-6 text-[22px] font-semibold">Agregar vehículo</h1>
      <FormularioVehiculo catalogo={catalogo} accion={agregarVehiculo} conKilometraje textoBoton="Agregar vehículo" />
    </section>
  );
}
