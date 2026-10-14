import { ChevronRight, Paperclip } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { historialDelVehiculo } from "@/datos/intervenciones";
import { exigirClaims } from "@/datos/sesion";
import { obtenerVehiculo } from "@/datos/vehiculos";
import { formatearFecha } from "@/dominio/fechas";
import { detalleDelTrabajo, formatearCosto } from "@/dominio/vista-trabajo";
import { BarraTrabajo } from "../trabajos/barra";

export const metadata: Metadata = { title: "Historial · Libreta de service" };

/** Pantalla 16 (CU-13, RF-17): del más nuevo al más viejo; sin supuestos pendientes ni a verificar. */
export default async function HistorialPagina({ params }: PageProps<"/vehiculos/[id]/historial">) {
  const { id } = await params;
  const claims = await exigirClaims();
  const [v, trabajos] = await Promise.all([obtenerVehiculo(claims, id), historialDelVehiculo(claims, id)]);
  if (!v || !trabajos) notFound();

  return (
    <section className="flex min-h-[calc(100dvh-8rem)] flex-col">
      <BarraTrabajo volver={`/vehiculos/${id}`} titulo="Historial" />
      <p className="text-sm text-muted-foreground">
        {v.nombre} {v.anio}
      </p>
      {trabajos.length === 0 ? (
        <>
          {/* CU-13 2a */}
          <div className="mt-12">
            <p className="text-[17px] font-semibold">Todavía no registraste trabajos para este vehículo.</p>
            <p className="mt-1 text-muted-foreground">Cuando registres uno, el plan vuelve a contar desde ese día.</p>
          </div>
          <Button asChild className="mt-auto h-12 w-full">
            <Link href={`/vehiculos/${id}/registrar`}>Registrar el primero</Link>
          </Button>
        </>
      ) : (
        <>
          <ul className="mt-3 divide-y divide-border overflow-hidden rounded-[14px] border border-border bg-card">
            {trabajos.map((t) => {
              const [dia, mes, anio] = formatearFecha(t.fecha).split("/");
              return (
                <li key={t.id}>
                  <Link
                    href={`/vehiculos/${id}/historial/${t.id}`}
                    className="flex gap-4 px-4 py-4 transition-colors hover:bg-muted"
                  >
                    <span className="w-14 shrink-0 border-r border-border pr-3 font-medium tabular-nums">
                      {dia}/{mes}
                      <span className="block text-sm font-normal text-muted-foreground">{anio}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-3">
                        <span className="font-semibold">
                          {t.descripcion}
                          {t.tieneComprobante && (
                            <Paperclip
                              className="ml-1.5 inline size-4 align-[-2px] text-muted-foreground"
                              role="img"
                              aria-label="Con comprobante"
                            />
                          )}
                        </span>
                        {t.costo !== null && (
                          <span className="shrink-0 font-semibold tabular-nums">{formatearCosto(t.costo)}</span>
                        )}
                      </span>
                      <span className="block text-sm text-muted-foreground tabular-nums">{detalleDelTrabajo(t)}</span>
                      {!t.editable && (
                        <span className="block text-sm text-muted-foreground">Dato del alta, confirmado por vos</span>
                      )}
                    </span>
                    <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
          </ul>
          <Button asChild className="mt-6 h-12 w-full">
            <Link href={`/vehiculos/${id}/registrar`}>Registrar trabajo</Link>
          </Button>
        </>
      )}
    </section>
  );
}
