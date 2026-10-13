"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { Aviso } from "@/components/aviso";
import type { Cambio } from "@/dominio/motor";
import { textoCambios } from "@/dominio/vista-estado";
import { cn } from "@/lib/utils";

type Ultimos = { km: number; cambios: Cambio[] } | null;
const Contexto = createContext<{ ultimos: Ultimos; publicar: (u: Ultimos) => void }>({
  ultimos: null,
  publicar: () => {},
});

/** CU-08 paso 7: los cambios de la última lectura viven solo mientras dura esta visita a la ficha. */
export function ProveedorCambios({ children }: { children: ReactNode }) {
  const [ultimos, publicar] = useState<Ultimos>(null);
  return <Contexto.Provider value={{ ultimos, publicar }}>{children}</Contexto.Provider>;
}

export function usePublicarCambios() {
  return useContext(Contexto).publicar;
}

export function AvisoCambios() {
  const { ultimos } = useContext(Contexto);
  const texto = ultimos && textoCambios(ultimos.km, ultimos.cambios);
  return texto ? (
    <div className="mt-4">
      <Aviso tipo="info">{texto}</Aviso>
    </div>
  ) : null;
}

/** Fila de la sección Mantenimiento; la línea oro marca lo que cambió con la última lectura (mockup 14). */
export function FilaItem({ itemId, className, children }: { itemId: number; className: string; children: ReactNode }) {
  const { ultimos } = useContext(Contexto);
  const cambio = ultimos?.cambios.some((c) => c.itemId === itemId);
  return <li className={cn(className, cambio && "shadow-[inset_2px_0_0_0_var(--color-oro)]")}>{children}</li>;
}
