"use client";

import { Boxes, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const SECCIONES = [
  { href: "/admin/modelos", texto: "Modelos", Icono: Boxes, rol: "administrador_catalogo" },
  { href: "/admin/usuarios", texto: "Usuarios", Icono: Users, rol: "administrador_tecnico" },
] as const;

/** Solo las secciones del rol que se tiene; la activa con la línea oro (DESIGN.md). */
export function NavAdmin({ roles }: { roles: string[] }) {
  const ruta = usePathname();
  return (
    <nav className="flex gap-1 px-3 pb-3 md:flex-col md:pb-0">
      {SECCIONES.filter((s) => roles.includes(s.rol)).map(({ href, texto, Icono }) => {
        const activa = ruta.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={activa ? "page" : undefined}
            className={cn(
              "flex h-10 items-center gap-2 border-l-2 px-3 text-sm",
              activa ? "border-oro bg-card font-medium" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <Icono className="size-4" aria-hidden="true" /> {texto}
          </Link>
        );
      })}
    </nav>
  );
}
