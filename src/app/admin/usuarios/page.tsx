import type { Metadata } from "next";
import { exigirRol } from "@/datos/sesion";
import { Buscador } from "./buscador";

export const metadata: Metadata = { title: "Usuarios · Administración" };

/** Pantalla 18 (CU-18): solo el administrador técnico; para el resto, 404. */
export default async function UsuariosPagina() {
  await exigirRol("administrador_tecnico");
  return (
    <section className="max-w-[900px]">
      <h1 className="text-[22px] font-semibold">Usuarios</h1>
      <p className="mt-1 text-muted-foreground">
        Buscá una cuenta por su correo exacto para darle o sacarle el rol de administrador de catálogo.
      </p>
      <div className="mt-6">
        <Buscador />
      </div>
    </section>
  );
}
