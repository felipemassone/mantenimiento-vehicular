import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Aviso } from "@/components/aviso";
import { ChipEstado } from "@/components/chip-estado";
import { Button } from "@/components/ui/button";
import { estadoDelVehiculo } from "@/datos/estado";
import { exigirClaims } from "@/datos/sesion";
import { obtenerVehiculo } from "@/datos/vehiculos";
import { formatearFecha } from "@/dominio/fechas";
import { formatearKm } from "@/dominio/kilometraje";
import { chipsDeItem, textoInciertos } from "@/dominio/vista-estado";
import { cn } from "@/lib/utils";
import { EliminarVehiculo } from "./eliminar";
import { ActualizarKilometraje } from "./kilometraje";

export const metadata: Metadata = { title: "Ficha del vehículo · Libreta de service" };

export default async function FichaVehiculoPagina({ params }: PageProps<"/vehiculos/[id]">) {
  const { id } = await params;
  const claims = await exigirClaims();
  const [v, estado] = await Promise.all([obtenerVehiculo(claims, id), estadoDelVehiculo(claims, id)]);
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

      <h2 className="mt-8 text-[17px] font-semibold">Mantenimiento</h2>
      {estado?.catalogado ? (
        <>
          {textoInciertos(estado.items) && (
            <p className="mt-1 text-sm text-muted-foreground">{textoInciertos(estado.items)}</p>
          )}
          {/* CU-09 / RF-12: ya vienen ordenados por urgencia desde el motor. */}
          <ul className="mt-3 space-y-2">
            {estado.items.map((i) => (
              <li
                key={i.itemId}
                className={cn(
                  "flex items-start justify-between gap-3 rounded-[14px] border bg-card p-4",
                  i.incertidumbre ? "border-dashed border-estado-confirmar-borde" : "border-border",
                )}
              >
                <div className="min-w-0">
                  <p className="font-medium">{i.nombre}</p>
                  <p className="text-sm text-muted-foreground tabular-nums">{i.detalle}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {chipsDeItem(i).map((c) => (
                    <ChipEstado key={c.tipo} {...c} />
                  ))}
                </div>
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
