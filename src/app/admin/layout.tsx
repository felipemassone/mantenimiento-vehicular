import { Boxes, Users } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { exigirRol } from "@/datos/sesion";

export default async function LayoutAdmin({ children }: { children: React.ReactNode }) {
  const claims = await exigirRol("administrador_catalogo");
  return (
    <div className="min-h-dvh md:flex">
      <aside className="flex flex-col border-b border-border bg-muted md:w-60 md:shrink-0 md:border-b-0 md:border-r">
        <div className="px-5 pb-4 pt-5">
          <Logo subtitulo="Administración" />
        </div>
        <nav className="flex gap-1 px-3 pb-3 md:flex-col md:pb-0">
          <Link
            href="/admin/modelos"
            className="flex h-10 items-center gap-2 border-l-2 border-oro bg-card px-3 text-sm font-medium"
          >
            <Boxes className="size-4" aria-hidden="true" /> Modelos
          </Link>
          <span className="flex h-10 items-center gap-2 px-3 text-sm text-muted-foreground">
            <Users className="size-4" aria-hidden="true" /> Usuarios
            <span className="rounded-sm bg-card px-1.5 text-[11px]">Próximamente</span>
          </span>
        </nav>
        <div className="mt-auto px-5 py-4 text-[13px]">
          <p className="text-muted-foreground">{claims.email}</p>
          <Link href="/vehiculos" className="text-primary underline underline-offset-4">
            Ir a Mis vehículos
          </Link>
        </div>
      </aside>
      <main className="w-full max-w-[1120px] px-4 py-6 md:px-8 md:py-8">{children}</main>
    </div>
  );
}
