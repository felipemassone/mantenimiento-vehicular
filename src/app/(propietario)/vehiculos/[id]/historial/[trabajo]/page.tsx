import { Eye } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { enlaceDelComprobante } from "@/datos/comprobantes";
import { intervencionDelVehiculo } from "@/datos/intervenciones";
import { exigirClaims } from "@/datos/sesion";
import { formatearFecha } from "@/dominio/fechas";
import { formatearKm } from "@/dominio/kilometraje";
import { formatearCosto } from "@/dominio/vista-trabajo";
import { createClient } from "@/lib/supabase/server";
import { BarraTrabajo } from "../../trabajos/barra";
import { EliminarTrabajo } from "./eliminar";

export const metadata: Metadata = { title: "Trabajo · Libreta de service" };

/** Pantalla 17 (CU-13 paso 3, CU-12). */
export default async function DetalleTrabajoPagina({ params }: PageProps<"/vehiculos/[id]/historial/[trabajo]">) {
  const { id, trabajo } = await params;
  const claims = await exigirClaims();
  const t = await intervencionDelVehiculo(claims, id, trabajo);
  if (!t) notFound();
  // RF-15: enlace firmado de 60 segundos; la imagen nunca es pública.
  const imagen = t.rutaComprobante ? await enlaceDelComprobante(await createClient(), t.rutaComprobante) : null;

  const datos: [string, string][] = [
    ["Fecha", formatearFecha(t.fecha)],
    ["Kilometraje", `${formatearKm(t.km)} km`],
  ];
  if (t.taller) datos.push(["Taller", t.taller]);
  if (t.costo !== null) datos.push(["Costo", formatearCosto(t.costo)]);

  return (
    <section>
      <BarraTrabajo volver={`/vehiculos/${id}/historial`} titulo={t.descripcion} />
      <dl className="divide-y divide-border rounded-[14px] border border-border bg-card px-5">
        {datos.map(([etiqueta, valor]) => (
          <div key={etiqueta} className="py-4">
            <dt className="text-sm text-muted-foreground">{etiqueta}</dt>
            <dd className="mt-1 tabular-nums">{valor}</dd>
          </div>
        ))}
      </dl>

      {t.rutaComprobante && (
        <div className="mt-6">
          <p className="text-sm text-muted-foreground">Comprobante</p>
          {imagen ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- enlace firmado de Storage, de 60 s */}
              <img
                src={imagen}
                alt={`Comprobante de ${t.descripcion}`}
                className="mt-2 max-h-80 w-full rounded-[14px] border border-border bg-muted object-contain"
              />
              <a
                href={`/vehiculos/${id}/historial/${trabajo}/comprobante`}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary"
              >
                <Eye className="size-4" aria-hidden="true" /> Ver en tamaño completo
              </a>
            </>
          ) : (
            <p className="mt-2 text-sm">No pudimos mostrar el comprobante. Probá recargar la página.</p>
          )}
        </div>
      )}

      {t.editable ? (
        <div className="mt-8 space-y-3">
          <Button asChild variant="outline" className="h-12 w-full">
            <Link href={`/vehiculos/${id}/historial/${trabajo}/editar`}>Editar</Link>
          </Button>
          <EliminarTrabajo vehiculoId={id} trabajoId={trabajo} />
        </div>
      ) : (
        <p className="mt-8 text-sm text-muted-foreground">
          Dato del alta, confirmado por vos. Si estaba mal, registrá el trabajo real.
        </p>
      )}
    </section>
  );
}
