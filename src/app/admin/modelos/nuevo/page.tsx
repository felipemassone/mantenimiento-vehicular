import type { Metadata } from "next";
import Link from "next/link";
import { marcasExistentes } from "@/datos/catalogo";
import { exigirRol } from "@/datos/sesion";
import { guardarModelo } from "../../acciones";
import { FormularioModelo } from "../formulario";

export const metadata: Metadata = { title: "Nuevo modelo · Administración" };

export default async function NuevoModeloPagina() {
  const claims = await exigirRol("administrador_catalogo");
  const marcas = await marcasExistentes(claims);
  return (
    <section>
      <p className="text-sm">
        <Link href="/admin/modelos" className="text-primary underline underline-offset-4">
          Modelos
        </Link>
        <span className="text-muted-foreground"> / Nuevo modelo</span>
      </p>
      <h1 className="mb-6 mt-2 text-[22px] font-semibold">Nuevo modelo</h1>
      <FormularioModelo accion={guardarModelo.bind(null, null)} marcas={marcas} textoBoton="Crear modelo" />
    </section>
  );
}
