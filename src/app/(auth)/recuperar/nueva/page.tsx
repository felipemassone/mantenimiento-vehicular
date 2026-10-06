import type { Metadata } from "next";
import { exigirClaims } from "@/datos/sesion";
import { FormularioNuevaContrasena } from "./formulario";

export const metadata: Metadata = { title: "Contraseña nueva · Libreta de service" };

export default async function NuevaContrasenaPagina() {
  await exigirClaims();
  return <FormularioNuevaContrasena />;
}
