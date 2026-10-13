import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { supuestosDelVehiculo } from "@/datos/estado";
import { exigirClaims } from "@/datos/sesion";
import { obtenerVehiculo } from "@/datos/vehiculos";
import { filaAbierta } from "@/dominio/confirmacion";
import { formatearKm } from "@/dominio/kilometraje";
import { ListaSupuestos } from "./supuestos";

export const metadata: Metadata = { title: "Confirmar datos · Libreta de service" };

export default async function ConfirmarPagina({ params, searchParams }: PageProps<"/vehiculos/[id]/confirmar">) {
  const { id } = await params;
  const { desde, item } = await searchParams;
  const claims = await exigirClaims();
  const [v, s] = await Promise.all([obtenerVehiculo(claims, id), supuestosDelVehiculo(claims, id)]);
  if (!v || !s) notFound();
  if (s.supuestos.length === 0) redirect(`/vehiculos/${id}`);
  const deAlta = desde === "alta";
  const abierta = filaAbierta(s.supuestos, typeof item === "string" ? item : undefined);
  const filas = s.supuestos.map((x) => ({ ...x, km: formatearKm(x.km) }));

  return (
    <section>
      <Link href={`/vehiculos/${id}`} className="mb-4 inline-flex items-center gap-1 text-sm">
        <ArrowLeft className="size-4" aria-hidden="true" /> Volver
      </Link>
      <h1 className="text-[22px] font-semibold">Confirmar datos</h1>
      {deAlta && (
        <p className="mt-3">
          Como cargaste el {v.nombre} con {formatearKm(s.kmActual)} km, supusimos cuándo se hizo por última vez cada
          uno de estos trabajos. Confirmalo si lo sabés: así el cálculo usa también las fechas.
        </p>
      )}
      <div className="mt-6">
        {/* La clave remonta la lista cuando cambia qué falta responder, para abrir la fila que sigue. */}
        <ListaSupuestos
          key={s.supuestos.map((x) => `${x.itemId}:${x.origen}`).join(",")}
          vehiculoId={id}
          filas={filas}
          abierta={abierta}
          deAlta={deAlta}
        />
      </div>
      {deAlta && (
        <Button asChild variant="outline" className="mt-6 h-12 w-full">
          <Link href={`/vehiculos/${id}`}>Más tarde</Link>
        </Button>
      )}
    </section>
  );
}
