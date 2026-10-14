import { ArrowLeft } from "lucide-react";
import Link from "next/link";

/** Diseños 15 a 17: "← Volver" a la izquierda y el título centrado. */
export function BarraTrabajo({ volver, titulo }: { volver: string; titulo: string }) {
  return (
    <div className="mb-6 grid grid-cols-[auto_1fr_auto] items-center gap-2">
      <Link href={volver} className="inline-flex items-center gap-1 text-sm">
        <ArrowLeft className="size-4" aria-hidden="true" /> Volver
      </Link>
      <h1 className="line-clamp-2 text-center text-[17px] font-semibold leading-snug">{titulo}</h1>
      {/* Contrapeso de "Volver" para que el título quede centrado. */}
      <span className="invisible inline-flex items-center gap-1 text-sm" aria-hidden="true">
        <ArrowLeft className="size-4" /> Volver
      </span>
    </div>
  );
}
