import { CircleCheck, CircleHelp, OctagonAlert, TriangleAlert, type LucideIcon } from "lucide-react";
import type { TipoChip } from "@/dominio/vista-estado";

const ESTILO: Record<TipoChip, { clase: string; Icono: LucideIcon }> = {
  vencido: { clase: "bg-estado-vencido-fondo text-estado-vencido", Icono: OctagonAlert },
  proximo: { clase: "bg-estado-proximo-fondo text-estado-proximo", Icono: TriangleAlert },
  al_dia: { clase: "bg-estado-al-dia-fondo text-estado-al-dia", Icono: CircleCheck },
  a_confirmar: { clase: "bg-estado-confirmar-fondo text-estado-confirmar", Icono: CircleHelp },
  verificar_en_taller: { clase: "bg-estado-confirmar-fondo text-estado-confirmar", Icono: CircleHelp },
};

/** Chip de estado (DESIGN.md): pastilla con ícono y palabra, 13 px; nunca solo color. */
export function ChipEstado({ tipo, texto }: { tipo: TipoChip; texto: string }) {
  const { clase, Icono } = ESTILO[tipo];
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[13px] font-medium ${clase}`}>
      <Icono className="size-3.5" aria-hidden="true" />
      {texto}
    </span>
  );
}
