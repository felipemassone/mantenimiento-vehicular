import { ChevronRight, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ChipEstado } from "@/components/chip-estado";
import { Button } from "@/components/ui/button";
import { resumenesDeMisVehiculos } from "@/datos/estado";
import { exigirClaims } from "@/datos/sesion";
import { listarVehiculos } from "@/datos/vehiculos";
import { formatearKm } from "@/dominio/kilometraje";
import { chipsDeResumen } from "@/dominio/vista-estado";

export const metadata: Metadata = { title: "Mis vehículos · Libreta de service" };

export default async function VehiculosPagina() {
  const claims = await exigirClaims();
  const [vehiculos, resumenes] = await Promise.all([listarVehiculos(claims), resumenesDeMisVehiculos(claims)]);

  return (
    <section>
      <h1 className="text-[22px] font-semibold">Mis vehículos</h1>
      {vehiculos.length === 0 ? (
        <>
          <p className="mt-6">Todavía no cargaste ningún vehículo.</p>
          <p className="mt-1 text-sm text-muted-foreground">Cargá tu auto y te decimos qué mantenimiento le toca.</p>
        </>
      ) : (
        <ul className="mt-6 space-y-3">
          {vehiculos.map((v) => (
            <li key={v.id}>
              <Link
                href={`/vehiculos/${v.id}`}
                className="block rounded-[14px] border border-border bg-card p-4 transition-colors hover:bg-muted"
              >
                <span className="flex items-center justify-between gap-3">
                  <span>
                    <span className="block text-[17px] font-semibold">{v.nombre}</span>
                    <span className="block text-sm text-muted-foreground">{v.anio}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    {v.kilometraje !== null && (
                      <span className="text-sm font-medium tabular-nums">{formatearKm(v.kilometraje)} km</span>
                    )}
                    <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
                  </span>
                </span>
                {resumenes[v.id] && (
                  <span className="mt-3 flex flex-wrap gap-1.5">
                    {chipsDeResumen(resumenes[v.id]!).map((c) => (
                      <ChipEstado key={c.tipo} {...c} />
                    ))}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Button asChild className="mt-6 h-12 w-full">
        <Link href="/vehiculos/nuevo">
          <Plus className="size-4" aria-hidden="true" /> Agregar vehículo
        </Link>
      </Button>
    </section>
  );
}
