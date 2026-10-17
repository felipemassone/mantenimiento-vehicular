import { ArrowLeft, ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Aviso } from "@/components/aviso";
import { BarraVolver } from "@/components/barra-volver";
import { ChipEstado } from "@/components/chip-estado";
import { Pasos } from "@/components/pasos";
import { Button } from "@/components/ui/button";
import { fichaDelVehiculo } from "@/datos/ficha";
import { exigirClaims } from "@/datos/sesion";
import { formatearFecha } from "@/dominio/fechas";
import { formatearKm } from "@/dominio/kilometraje";
import {
  chipsDeItem,
  destinoDeItem,
  textoCambiosTrabajo,
  textoInciertos,
  ultimosTrabajosPorItem,
} from "@/dominio/vista-estado";
import { leerCambios } from "@/dominio/vista-trabajo";
import { cn } from "@/lib/utils";
import { AvisoCambios, FilaItem, ProveedorCambios } from "./cambios";
import { EliminarVehiculo } from "./eliminar";
import { ActualizarKilometraje } from "./kilometraje";

export const metadata: Metadata = { title: "Ficha del vehículo" };

export default async function FichaVehiculoPagina({ params, searchParams }: PageProps<"/vehiculos/[id]">) {
  const { id } = await params;
  const { cambios, bienvenida } = await searchParams;
  const claims = await exigirClaims();
  const ficha = await fichaDelVehiculo(claims, id);
  if (!ficha) notFound();
  const { vehiculo: v, estado, historial } = ficha;
  const ultimos = ultimosTrabajosPorItem(historial);

  const km = v.kilometraje === null ? "sin lecturas" : `${formatearKm(v.kilometraje)} km`;
  const ultima = v.fechaLectura ? `${km}, el ${formatearFecha(v.fechaLectura)}` : km;
  // CU-10 paso 7: los ítems que cambió el trabajo recién registrado, con su estado ya recalculado.
  const ids = leerCambios(cambios);
  const cambiados = (estado?.items ?? []).filter((i) => ids.includes(i.itemId));
  const texto = textoCambiosTrabajo(cambiados);
  const inicial = texto ? { texto, itemIds: cambiados.map((i) => i.itemId) } : null;

  return (
    <section>
      <ProveedorCambios inicial={inicial}>
        {bienvenida === "1" ? (
          <>
            <BarraVolver href="/vehiculos" />
            <Pasos actual={3} />
          </>
        ) : (
          <Link href="/vehiculos" className="mb-4 inline-flex items-center gap-1 text-sm">
            <ArrowLeft className="size-4" aria-hidden="true" /> Volver
          </Link>
        )}
        <h1 className="text-[22px] font-semibold">
          {v.nombre} {v.anio}
        </h1>
        {bienvenida === "1" && (
          // Primer auto guiado, paso 3 (pantalla 22): cómo se lee la ficha. "Entendido" saca el parámetro.
          <div className="mt-4">
            <Aviso tipo="info">
              <div className="text-foreground">
                <p className="font-medium">Listo, este es tu {v.nombre}.</p>
                {estado?.catalogado ? (
                  <ul className="mt-1 list-disc space-y-0.5 pl-5">
                    <li>Tocá un ítem para ver qué hacer con él.</li>
                    <li>
                      Actualizá el kilometraje cada tanto, por ejemplo cuando cargás nafta: con ese dato calculamos lo
                      que le toca.
                    </li>
                  </ul>
                ) : (
                  <p className="mt-1">
                    Como todavía no tenemos el plan de este modelo, acá vas a registrar los trabajos que le hagas y
                    tenerlos a mano en el historial.
                  </p>
                )}
                <Link
                  href={`/vehiculos/${v.id}`}
                  className="mt-2 inline-block font-medium text-primary underline underline-offset-4"
                >
                  Entendido
                </Link>
              </div>
            </Aviso>
          </div>
        )}

        <div className="mt-6">
          <p className="text-sm text-muted-foreground">Kilometraje actual</p>
          <p className="text-[28px] font-semibold leading-tight tabular-nums">{km}</p>
          {v.fechaLectura && (
            <p className="text-sm text-muted-foreground">Actualizado el {formatearFecha(v.fechaLectura)}</p>
          )}
          <div className="mt-4">
            <ActualizarKilometraje id={v.id} ultima={ultima} />
          </div>
          <AvisoCambios />
        </div>

        <h2 className="mt-8 text-[17px] font-semibold">Mantenimiento</h2>
        {estado?.catalogado ? (
          <>
            {textoInciertos(estado.items) && (
              <p className="mt-1 text-sm text-muted-foreground">{textoInciertos(estado.items)}</p>
            )}
            {/* CU-09 / RF-12: ya vienen ordenados por urgencia desde el motor. */}
            <ul className="mt-3 space-y-2">
              {estado.items.map((i) => {
                const destino = destinoDeItem(v.id, i, ultimos.get(i.itemId) ?? null);
                return (
                  <FilaItem
                    key={i.itemId}
                    itemId={i.itemId}
                    className={cn(
                      "relative flex items-start justify-between gap-3 rounded-[14px] border bg-card p-4 transition-colors hover:bg-muted",
                      i.incertidumbre ? "border-dashed border-estado-confirmar-borde" : "border-border",
                    )}
                  >
                    <div className="min-w-0">
                      {/* Toda la fila lleva a lo que pide el estado del ítem (destinoDeItem). */}
                      <Link href={destino.href} className="font-medium after:absolute after:inset-0 after:rounded-[14px]">
                        {i.nombre}
                      </Link>
                      <p className="text-sm text-muted-foreground tabular-nums">{i.detalle}</p>
                      {destino.secundario && (
                        <Link
                          href={destino.secundario.href}
                          className="relative z-10 mt-2 inline-block text-sm font-medium text-primary underline underline-offset-4"
                        >
                          {destino.secundario.texto}
                          {/* Que el lector de pantalla no lo confunda con el botón general. */}
                          <span className="sr-only"> de {i.nombre}</span>
                        </Link>
                      )}
                    </div>
                    {/* Pantalla 22: la flecha dice que toda la fila se puede tocar. */}
                    <div className="flex shrink-0 items-center gap-1 self-center">
                      <div className="flex flex-col items-end gap-1">
                        {chipsDeItem(i).map((c) => (
                          <ChipEstado key={c.tipo} {...c} />
                        ))}
                      </div>
                      <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
                    </div>
                  </FilaItem>
                );
              })}
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
          {/* Mockup 06: la acción principal de la ficha. */}
          <Button asChild className="h-12 w-full">
            <Link href={`/vehiculos/${v.id}/registrar`}>Registrar trabajo</Link>
          </Button>
          <Button asChild variant="outline" className="h-12 w-full">
            <Link href={`/vehiculos/${v.id}/historial`}>Historial</Link>
          </Button>
          <Button asChild variant="outline" className="h-12 w-full">
            <Link href={`/vehiculos/${v.id}/editar`}>Editar datos</Link>
          </Button>
          <EliminarVehiculo id={v.id} nombre={v.nombre} />
        </div>
      </ProveedorCambios>
    </section>
  );
}
