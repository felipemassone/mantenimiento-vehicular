import type { Metadata } from "next";
import { FormularioIngresar } from "./formulario";

export const metadata: Metadata = { title: "Ingresar · Libreta de service" };

export default async function IngresarPagina({ searchParams }: PageProps<"/ingresar">) {
  const { enlace, cuenta } = await searchParams;
  return <FormularioIngresar enlaceInvalido={enlace === "invalido"} cuentaEliminada={cuenta === "eliminada"} />;
}
