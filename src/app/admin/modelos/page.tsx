import { ChevronRight, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { listarModelos, type FilaModelo } from "@/datos/catalogo";
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
      {/* En el celular, una tarjeta por modelo: la tabla escondía "Ver plan" fuera de la pantalla. */}
      <ul className="mt-6 space-y-3 md:hidden">
        {modelos.map((m) => (
          <li key={m.id}>
            <Link
              href={`/admin/modelos/${m.id}`}
              className="flex items-center justify-between gap-3 rounded-[14px] border border-border bg-card p-4 transition-colors hover:bg-muted"
            >
              <span className="min-w-0 space-y-1.5">
                <span className="block text-[17px] font-semibold">
                  {m.marca} {m.nombre}
                </span>
                <span className="block text-sm text-muted-foreground tabular-nums">
                  {anios(m)} · {m.items} {m.items === 1 ? "ítem" : "ítems"}
                  {m.publicado?.fecha && ` · publicado el ${formatearFecha(m.publicado.fecha)}`}
                </span>
                <EstadoPlan modelo={m} />
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-6 hidden overflow-x-auto rounded-[14px] border border-border bg-card md:block">
        <table className="w-full text-sm">
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
                <td className="whitespace-nowrap px-4 py-3 tabular-nums">{anios(m)}</td>
                <td className="px-4 py-3">
                  <EstadoPlan modelo={m} />
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

function anios(m: FilaModelo): string {
  return m.anioHasta ? `${m.anioDesde}–${m.anioHasta}` : `desde ${m.anioDesde}`;
}

function EstadoPlan({ modelo }: { modelo: FilaModelo }) {
  return (
    <span className="flex flex-wrap gap-1">
      {modelo.publicado && (
        <span className="whitespace-nowrap rounded-full bg-primary/10 px-2 py-0.5 text-[13px] text-primary">
          Publicado · versión {modelo.publicado.version}
        </span>
      )}
      {modelo.borrador && (
        <span className="whitespace-nowrap rounded-full bg-muted px-2 py-0.5 text-[13px] text-muted-foreground">
          Borrador · versión {modelo.borrador}
        </span>
      )}
    </span>
  );
}
