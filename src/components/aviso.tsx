import { CircleCheck, Info, OctagonAlert, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

const estilos = {
  info: { caja: "border-primary/30 bg-primary/5 text-primary", Icono: Info },
  advertencia: { caja: "border-estado-proximo/30 bg-estado-proximo-fondo text-estado-proximo", Icono: TriangleAlert },
  error: { caja: "border-estado-vencido/30 bg-estado-vencido-fondo text-estado-vencido", Icono: OctagonAlert },
  exito: { caja: "border-estado-al-dia/30 bg-estado-al-dia-fondo text-estado-al-dia", Icono: CircleCheck },
} as const;

export function Aviso({ tipo, children }: { tipo: keyof typeof estilos; children: ReactNode }) {
  const { caja, Icono } = estilos[tipo];
  return (
    <div role={tipo === "error" ? "alert" : "status"} className={`flex gap-2 rounded-[10px] border p-3 text-sm ${caja}`}>
      <Icono className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}
