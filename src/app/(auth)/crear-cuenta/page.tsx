import type { Metadata } from "next";
import { FormularioCrearCuenta } from "./formulario";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function CrearCuentaPagina() {
  return <FormularioCrearCuenta />;
}
