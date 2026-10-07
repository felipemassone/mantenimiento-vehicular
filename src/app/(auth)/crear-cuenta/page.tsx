import type { Metadata } from "next";
import { FormularioCrearCuenta } from "./formulario";

export const metadata: Metadata = { title: "Crear cuenta · Libreta de service" };

export default function CrearCuentaPagina() {
  return <FormularioCrearCuenta />;
}
