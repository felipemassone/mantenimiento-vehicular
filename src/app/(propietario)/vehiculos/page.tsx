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

export const metadata: Metadata = { title: "Mis vehículos" };

/** Pantalla 19: los chips de muestra del paso 3, los mismos de la ficha. */
const MUESTRA = [
  { tipo: "vencido", texto: "Vencido" },
  { tipo: "proximo", texto: "Próximo" },
  { tipo: "al_dia", texto: "Al día" },
] as const;

const BIENVENIDA = [
  ["Cargá tu auto", "Marca, modelo, año y los kilómetros que marca el tablero."],
  ["Contanos lo que ya se hizo", "Si el auto tiene kilómetros, te preguntamos por los últimos services. Lo podés dejar para después."],
  ["Mirá qué te toca", "La ficha ordena el mantenimiento por urgencia."],
] as const;

export default async function VehiculosPagina() {
  const claims = await exigirClaims();
  const [vehiculos, resumenes] = await Promise.all([listarVehiculos(claims), resumenesDeMisVehiculos(claims)]);
  const primero = vehiculos.length === 0;

  return (
    <section>
      <h1 className="text-[22px] font-semibold">Mis vehículos</h1>
      {primero ? (
        // Primer auto guiado (spec 2026-10-16, apartado 3, paso 0): qué va a pasar en los tres pasos.
        <div className="mt-6 rounded-[14px] border border-border bg-card p-5">
          <h2 className="text-[17px] font-semibold">Empecemos por tu auto</h2>
          <p className="mt-1 text-sm text-muted-foreground">En tres pasos te decimos qué mantenimiento le toca.</p>
          <ol className="mt-5">
            {BIENVENIDA.map(([titulo, texto], i) => (
              // Pantalla 19: los círculos van unidos por una línea fina del color de los bordes.
              <li key={titulo} className="relative flex gap-3 pb-5 last:pb-0">
                <span
                  className="absolute bottom-0 left-3.5 top-0 w-px -translate-x-1/2 bg-border"
                  aria-hidden="true"
                />
                <span className="relative flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-[13px] font-semibold text-primary-foreground tabular-nums">
                  {i + 1}
                </span>
                <span className="min-w-0">
                  <span className="block font-medium">{titulo}</span>
                  <span className="block text-sm text-muted-foreground">{texto}</span>
                  {i === BIENVENIDA.length - 1 && (
                    <span className="mt-2 flex flex-wrap gap-1.5">
                      {MUESTRA.map((c) => (
                        <ChipEstado key={c.tipo} {...c} />
                      ))}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-5 border-t border-border pt-4 text-sm text-muted-foreground">
            Si tu modelo no figura en la lista, cargalo igual: vas a poder registrar los trabajos que le hagas.
          </p>
        </div>
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
          <Plus className="size-4" aria-hidden="true" /> {primero ? "Cargar mi auto" : "Agregar vehículo"}
        </Link>
      </Button>
    </section>
  );
}
