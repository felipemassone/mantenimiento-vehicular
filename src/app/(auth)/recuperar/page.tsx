import type { Metadata } from "next";
import { FormularioRecuperar } from "./formulario";

export const metadata: Metadata = { title: "Recuperar contraseña · Libreta de service" };

export default async function RecuperarPagina({ searchParams }: PageProps<"/recuperar">) {
  const { enlace } = await searchParams;
  return <FormularioRecuperar enlaceInvalido={enlace === "invalido"} />;
}
