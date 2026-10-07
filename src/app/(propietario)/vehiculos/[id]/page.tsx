import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Aviso } from "@/components/aviso";
import { Button } from "@/components/ui/button";
import { exigirClaims } from "@/datos/sesion";
import { obtenerVehiculo } from "@/datos/vehiculos";
import { formatearFecha } from "@/dominio/fechas";
import { formatearKm } from "@/dominio/kilometraje";
import { formatearIntervalo } from "@/dominio/vehiculo";
import { EliminarVehiculo } from "./eliminar";
import { ActualizarKilometraje } from "./kilometraje";

export const metadata: Metadata = { title: "Ficha del vehículo · Libreta de service" };

export default async function FichaVehiculoPagina({ params }: PageProps<"/vehiculos/[id]">) {
  const { id } = await params;
  const claims = await exigirClaims();
  const v = await obtenerVehiculo(claims, id);
  if (!v) notFound();

  const km = v.kilometraje === null ? "sin lecturas" : `${formatearKm(v.kilometraje)} km`;
  const ultima = v.fechaLectura ? `${km}, el ${formatearFecha(v.fechaLectura)}` : km;

  return (
    <section>
      <Link href="/vehiculos" className="mb-4 inline-flex items-center gap-1 text-sm">
        <ArrowLeft className="size-4" aria-hidden="true" /> Volver
      </Link>
      <h1 className="text-[22px] font-semibold">
        {v.nombre} {v.anio}
      </h1>

      <div className="mt-6">
        <p className="text-sm text-muted-foreground">Kilometraje actual</p>
        <p className="text-[28px] font-semibold leading-tight tabular-nums">{km}</p>
        {v.fechaLectura && (
          <p className="text-sm text-muted-foreground">Actualizado el {formatearFecha(v.fechaLectura)}</p>
        )}
        <div className="mt-4">
          <ActualizarKilometraje id={v.id} ultima={ultima} />
        </div>
      </div>

      <h2 className="mt-8 text-[17px] font-semibold">Plan del fabricante</h2>
      {v.plan ? (
        <>
          <p className="mt-1 text-sm text-muted-foreground">
            Pronto vas a ver acá el estado de cada ítem: al día, próximo o vencido.
          </p>
          <ul className="mt-3 divide-y divide-border overflow-hidden rounded-[14px] border border-border bg-card">
            {v.plan.items.map((i) => (
              <li key={i.nombre} className="px-4 py-3">
                <p className="font-medium">{i.nombre}</p>
                <p className="text-sm text-muted-foreground tabular-nums">
                  {i.tipo === "reemplazo" ? "Cambiar" : "Revisar"} · {formatearIntervalo(i.km, i.meses)}
                </p>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className="mt-3">
          <Aviso tipo="advertencia">
            Todavía no tenemos el plan de mantenimiento de este modelo. Vas a poder registrar los trabajos que le
            hagas.
          </Aviso>
        </div>
      )}

      <div className="mt-8 space-y-2">
        <Button asChild variant="outline" className="h-12 w-full">
          <Link href={`/vehiculos/${v.id}/editar`}>Editar datos</Link>
        </Button>
        <EliminarVehiculo id={v.id} nombre={v.nombre} />
      </div>
    </section>
  );
}
