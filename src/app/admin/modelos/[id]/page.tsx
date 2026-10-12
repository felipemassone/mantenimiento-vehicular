import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Aviso } from "@/components/aviso";
import { planDeTrabajo } from "@/datos/catalogo";
import { exigirRol } from "@/datos/sesion";
import { AgregarItem } from "./agregar-item";
import { COLUMNAS_ITEM } from "./columnas";
import { FilaItem } from "./fila-item";
import { AccionesPlan } from "./publicar";

export const metadata: Metadata = { title: "Plan de mantenimiento · Administración" };

export default async function PlanPagina({ params }: PageProps<"/admin/modelos/[id]">) {
  const id = Number((await params).id);
  const claims = await exigirRol("administrador_catalogo");
  const plan = await planDeTrabajo(claims, id);
  if (!plan) notFound();
  const { modelo, publicado, borrador, items } = plan;
  const anios = modelo.anioHasta ? `${modelo.anioDesde}–${modelo.anioHasta}` : `desde ${modelo.anioDesde}`;

  return (
    <section>
      <p className="text-sm">
        <Link href="/admin/modelos" className="text-primary underline underline-offset-4">
          Modelos
        </Link>
        <span className="text-muted-foreground">
          {" "}
          / {modelo.marca} {modelo.nombre} {anios} ·{" "}
        </span>
        <Link href={`/admin/modelos/${id}/editar`} className="text-primary underline underline-offset-4">
          Editar datos
        </Link>
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
        <h1 className="flex flex-wrap items-center gap-2 text-[22px] font-semibold">
          Plan de mantenimiento
          {borrador ? (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[13px] font-normal text-muted-foreground">
              Borrador · versión {borrador}
            </span>
          ) : (
            publicado && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[13px] font-normal text-primary">
                Publicado · versión {publicado.version}
              </span>
            )
          )}
        </h1>
        {borrador && <AccionesPlan modeloId={id} version={borrador} puedeDescartar={publicado !== null} />}
      </div>

      <div className="mt-4">
        {borrador && publicado && (
          <Aviso tipo="info">
            La versión {publicado.version} sigue publicada y es la que usan los propietarios hasta que publiques esta.
          </Aviso>
        )}
        {!borrador && publicado && (
          <Aviso tipo="info">
            Cualquier cambio crea la versión {publicado.version + 1} en borrador, sin afectar a los propietarios hasta
            que la publiques.
          </Aviso>
        )}
      </div>

      {/* Grilla en vez de tabla: en el celular cada ítem se apila y sus acciones quedan a la vista. */}
      <div className="mt-6 rounded-[14px] border border-border bg-card text-sm">
        <div
          className={`hidden gap-4 border-b border-border px-4 py-3 font-medium text-muted-foreground md:grid ${COLUMNAS_ITEM}`}
        >
          <span>Ítem</span>
          <span>Tipo</span>
          <span>Cada (km)</span>
          <span>Cada (meses)</span>
          <span />
        </div>
        {items.length === 0 ? (
          <p className="px-4 py-6 text-muted-foreground">Todavía no hay ítems. Agregá el primero.</p>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((i) => (
              <FilaItem key={i.itemId} modeloId={id} item={i} />
            ))}
          </ul>
        )}
      </div>
      <div className="mt-4">
        <AgregarItem modeloId={id} />
      </div>
    </section>
  );
}
