import { ArrowLeft } from "lucide-react";
import Link from "next/link";

/**
 * Pantallas 20 a 22 (primer auto guiado): la barra superior lleva solo "Volver", sin logo ni botón de
 * cuenta. `data-sin-encabezado` esconde el encabezado del layout (ver (propietario)/layout.tsx).
 */
export function BarraVolver({ href }: { href: string }) {
  return (
    <div data-sin-encabezado className="-mx-4 -mt-6 mb-4 border-b border-border px-4">
      <div className="flex h-14 items-center">
        <Link href={href} className="inline-flex min-h-11 items-center gap-1 text-sm font-medium">
          <ArrowLeft className="size-5" aria-hidden="true" /> Volver
        </Link>
      </div>
    </div>
  );
}
