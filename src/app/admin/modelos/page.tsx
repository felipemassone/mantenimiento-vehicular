import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { listarModelos } from "@/datos/catalogo";
import { exigirRol } from "@/datos/sesion";
import { formatearFecha } from "@/dominio/fechas";

export const metadata: Metadata = { title: "Modelos · Administración" };

export default async function ModelosPagina() {
  const claims = await exigirRol("administrador_catalogo");
  const modelos = await listarModelos(claims);

  return (
    <section>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-[22px] font-semibold">Modelos</h1>
        <Button asChild className="h-12">
          <Link href="/admin/modelos/nuevo">
            <Plus className="size-4" aria-hidden="true" /> Nuevo modelo
          </Link>
        </Button>
      </div>
      <div className="mt-6 overflow-x-auto rounded-[14px] border border-border bg-card">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="text-left text-muted-foreground">
            <tr className="border-b border-border">
              <th className="px-4 py-3 font-medium">Marca</th>
              <th className="px-4 py-3 font-medium">Modelo</th>
              <th className="px-4 py-3 font-medium">Años</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Ítems</th>
              <th className="px-4 py-3 font-medium">Publicado el</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {modelos.map((m) => (
              <tr key={m.id}>
                <td className="whitespace-nowrap px-4 py-3">{m.marca}</td>
                <td className="whitespace-nowrap px-4 py-3">{m.nombre}</td>
                <td className="whitespace-nowrap px-4 py-3 tabular-nums">
                  {m.anioHasta ? `${m.anioDesde}–${m.anioHasta}` : `desde ${m.anioDesde}`}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {m.publicado && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[13px] text-primary">
                        Publicado · versión {m.publicado.version}
                      </span>
                    )}
                    {m.borrador && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[13px] text-muted-foreground">
                        Borrador · versión {m.borrador}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 tabular-nums">{m.items}</td>
                <td className="whitespace-nowrap px-4 py-3 tabular-nums">
                  {m.publicado?.fecha ? formatearFecha(m.publicado.fecha) : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/modelos/${m.id}`} className="text-primary underline underline-offset-4">
                    Ver plan
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
