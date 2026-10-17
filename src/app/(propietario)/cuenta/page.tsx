import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { cerrarSesion } from "@/app/(auth)/acciones";
import { rolesDelUsuario } from "@/datos/cuenta";
import { exigirClaims } from "@/datos/sesion";
import { esAdministrador, nombreDeRol } from "@/dominio/roles";
import { EliminarCuenta } from "./eliminar";

export const metadata: Metadata = { title: "Mi cuenta" };

export default async function CuentaPagina() {
  const claims = await exigirClaims();
  const roles = await rolesDelUsuario(claims);
  const esAdmin = esAdministrador(roles);

  return (
    <section>
      <h1 className="text-[22px] font-semibold">Mi cuenta</h1>
      <div className="mt-6">
        <p className="font-semibold">{claims.email}</p>
        <p className="text-sm text-muted-foreground">{roles.map(nombreDeRol).join(" · ")}</p>
      </div>
      <ul className="mt-6 divide-y divide-border overflow-hidden rounded-[14px] border border-border bg-card">
        {esAdmin && (
          <li>
            <Link href="/admin" className="flex h-12 items-center justify-between px-4 transition-colors hover:bg-muted">
              Cambiar a Administración <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
            </Link>
          </li>
        )}
        <li>
          <form action={cerrarSesion}>
            <button type="submit" className="flex h-12 w-full items-center px-4 text-left transition-colors hover:bg-muted">
              Cerrar sesión
            </button>
          </form>
        </li>
      </ul>
      <div className="mt-8 overflow-hidden rounded-[14px] border border-border bg-card">
        <EliminarCuenta />
      </div>
    </section>
  );
}
