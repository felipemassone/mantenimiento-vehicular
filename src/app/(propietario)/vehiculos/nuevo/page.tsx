import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Pasos } from "@/components/pasos";
import { exigirClaims } from "@/datos/sesion";
import { catalogoPublicado, listarVehiculos } from "@/datos/vehiculos";
import { agregarVehiculo } from "../acciones";
import { FormularioVehiculo } from "../formulario";

export const metadata: Metadata = { title: "Agregar vehículo" };

export default async function NuevoVehiculoPagina() {
  const claims = await exigirClaims();
  const [catalogo, vehiculos] = await Promise.all([catalogoPublicado(claims), listarVehiculos(claims)]);
  const primero = vehiculos.length === 0;
  return (
    <section>
      <Link href="/vehiculos" className="mb-4 inline-flex items-center gap-1 text-sm">
        <ArrowLeft className="size-4" aria-hidden="true" /> Volver
      </Link>
      {primero && <Pasos actual={1} />}
      <h1 className="mb-6 text-[22px] font-semibold">{primero ? "Tu auto" : "Agregar vehículo"}</h1>
      <FormularioVehiculo
        catalogo={catalogo}
        accion={agregarVehiculo}
        conKilometraje
        ayudaKilometraje="El que marca el tablero hoy. Con el número aproximado alcanza."
        textoBoton={primero ? "Seguir" : "Agregar vehículo"}
      />
    </section>
  );
}
