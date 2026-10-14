import Link from "next/link";
import { Logo } from "@/components/logo";
import { exigirAdministracion } from "@/datos/sesion";
import { NavAdmin } from "./nav-admin";

export default async function LayoutAdmin({ children }: { children: React.ReactNode }) {
  const { claims, roles } = await exigirAdministracion();
  return (
    <div className="min-h-dvh md:flex">
      <aside className="flex flex-col border-b border-border bg-muted md:w-60 md:shrink-0 md:border-b-0 md:border-r">
        <div className="px-5 pb-4 pt-5">
          <Logo subtitulo="Administración" />
        </div>
        <NavAdmin roles={roles} />
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
