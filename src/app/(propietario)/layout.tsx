import Link from "next/link";
import { Logo } from "@/components/logo";
import { exigirClaims } from "@/datos/sesion";
import { iniciales } from "@/dominio/cuenta";

export default async function LayoutPropietario({ children }: { children: React.ReactNode }) {
  const claims = await exigirClaims();
  return (
    <>
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex h-14 w-full max-w-[720px] items-center justify-between px-4">
          <Link href="/vehiculos" aria-label="Mis vehículos">
            <Logo />
          </Link>
          <Link
            href="/cuenta"
            aria-label="Mi cuenta"
            className="flex size-9 items-center justify-center rounded-full bg-primary text-[13px] font-semibold text-primary-foreground"
          >
            {iniciales(claims.email ?? "")}
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[720px] px-4 pb-10 pt-6">{children}</main>
    </>
  );
}
