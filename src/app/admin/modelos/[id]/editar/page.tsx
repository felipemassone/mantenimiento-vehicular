import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { marcasExistentes, obtenerModelo } from "@/datos/catalogo";
import { exigirRol } from "@/datos/sesion";
import { guardarModelo } from "../../../acciones";
import { FormularioModelo } from "../../formulario";

export const metadata: Metadata = { title: "Editar modelo · Administración" };

export default async function EditarModeloPagina({ params }: PageProps<"/admin/modelos/[id]/editar">) {
  const id = Number((await params).id);
  const claims = await exigirRol("administrador_catalogo");
  const [modelo, marcas] = await Promise.all([obtenerModelo(claims, id), marcasExistentes(claims)]);
  if (!modelo) notFound();
  return (
    <section>
      <p className="text-sm">
        <Link href={`/admin/modelos/${id}`} className="text-primary underline underline-offset-4">
          {modelo.marca} {modelo.nombre}
        </Link>
        <span className="text-muted-foreground"> / Editar</span>
      </p>
      <h1 className="mb-6 mt-2 text-[22px] font-semibold">Editar modelo</h1>
      <FormularioModelo
        accion={guardarModelo.bind(null, id)}
        marcas={marcas}
        inicial={modelo}
        textoBoton="Guardar cambios"
      />
    </section>
  );
}
